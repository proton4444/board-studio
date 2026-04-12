import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BoardCanvas from "../components/BoardCanvas";
import HistoryTray from "../components/HistoryTray";
import MediaOutputPanel from "../components/MediaOutputPanel";
import PromptBlock from "../components/PromptBlock";
import Sidebar from "../components/Sidebar";
import { pollGenerationStatus, requestGeneration } from "../lib/api";
import { listBoards, listGenerationsByBoard, loadBoard, saveBoard, saveGeneration } from "../lib/storage";
import { createId, nowIso } from "../lib/utils";
import type { Board, Card, CardType } from "../schemas/board";
import type { GenerationRecord, GenerationStatus, MediaItem } from "../schemas/media";

type ComposerStatus = GenerationStatus | "idle";

const cardDefaults: Record<CardType, Pick<Card, "content" | "size">> = {
  prompt: {
    content: "Write a concise prompt with subject, lighting, texture, and composition.",
    size: { w: 360, h: 224 },
  },
  note: {
    content: "Creative note: palette, pacing, references, or production constraints.",
    size: { w: 280, h: 220 },
  },
  output: {
    content: "Output summaries appear here once a generation completes.",
    size: { w: 320, h: 220 },
  },
};

function createCard(type: CardType, index: number): Card {
  return {
    id: createId("card"),
    type,
    content: cardDefaults[type].content,
    position: {
      x: 60 + index * 28,
      y: 64 + index * 28,
    },
    size: cardDefaults[type].size,
    createdAt: nowIso(),
  };
}

function summariseMediaItem(item: MediaItem | undefined): string {
  if (!item) {
    return "Generation completed without a media payload.";
  }

  if (item.content) {
    return item.content;
  }

  if (item.url) {
    return `${item.type.toUpperCase()} ready: ${item.url}`;
  }

  return `${item.type.toUpperCase()} output ready.`;
}

function BoardEditor() {
  const { boardId } = useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [model, setModel] = useState("studio-vision-1");
  const [provider, setProvider] = useState("local-proxy");
  const [composerStatus, setComposerStatus] = useState<ComposerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  function refreshBoards() {
    setBoards(listBoards().map(({ id, name }) => ({ id, name })));
  }

  function refreshGenerations(nextSelectedId?: string | null) {
    if (!boardId) {
      setRecords([]);
      setSelectedGenerationId(null);
      return;
    }

    const nextRecords = listGenerationsByBoard(boardId);
    setRecords(nextRecords);
    setSelectedGenerationId(nextSelectedId ?? nextRecords[0]?.id ?? null);
  }

  function clearPollTimer() {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function updateBoard(update: (current: Board) => Board) {
    setBoard((current) => {
      if (!current) {
        return current;
      }

      return {
        ...update(current),
        updatedAt: nowIso(),
      };
    });
  }

  function applyGenerationToBoard(record: GenerationRecord) {
    const nextContent = summariseMediaItem(record.output?.[0]);

    updateBoard((current) => {
      const existingOutputCard =
        current.cards.find((card) => card.id === selectedCardId && card.type === "output") ??
        current.cards.find((card) => card.type === "output");

      if (existingOutputCard) {
        return {
          ...current,
          cards: current.cards.map((card) =>
            card.id === existingOutputCard.id
              ? {
                  ...card,
                  content: nextContent,
                }
              : card,
          ),
        };
      }

      return {
        ...current,
        cards: [
          ...current.cards,
          {
            id: createId("card"),
            type: "output",
            content: nextContent,
            position: { x: 460, y: 120 },
            size: cardDefaults.output.size,
            createdAt: nowIso(),
          },
        ],
      };
    });
  }

  async function pollRecord(recordId: string) {
    try {
      const nextRecord = await pollGenerationStatus(recordId);
      saveGeneration(nextRecord);
      refreshGenerations(nextRecord.id);
      setComposerStatus(nextRecord.status);

      if (nextRecord.status === "pending" || nextRecord.status === "running") {
        pollTimerRef.current = window.setTimeout(() => {
          void pollRecord(recordId);
        }, 1600);
        return;
      }

      if (nextRecord.status === "done") {
        applyGenerationToBoard(nextRecord);
        return;
      }

      setErrorMessage("Generation ended with an error state.");
    } catch (error) {
      setComposerStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Polling failed.");
    }
  }

  async function handleSubmitGeneration() {
    if (!board) {
      return;
    }

    const promptCard =
      board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
      board.cards.find((card) => card.type === "prompt");

    if (!promptCard || !promptCard.content.trim()) {
      setErrorMessage("A prompt card with text is required before generation can start.");
      return;
    }

    clearPollTimer();
    setErrorMessage(null);
    setComposerStatus("pending");

    const optimisticRecord: GenerationRecord = {
      id: createId("generation"),
      boardId: board.id,
      cardId: promptCard.id,
      prompt: promptCard.content.trim(),
      model,
      provider,
      status: "pending",
      createdAt: nowIso(),
    };

    saveGeneration(optimisticRecord);
    refreshGenerations(optimisticRecord.id);

    try {
      const response = await requestGeneration({
        prompt: optimisticRecord.prompt,
        model,
        provider,
        boardId: board.id,
        cardId: promptCard.id,
      });
      const mergedRecord: GenerationRecord = {
        ...optimisticRecord,
        ...response,
      };

      saveGeneration(mergedRecord);
      refreshGenerations(mergedRecord.id);
      setComposerStatus(mergedRecord.status);

      if (mergedRecord.status === "pending" || mergedRecord.status === "running") {
        pollTimerRef.current = window.setTimeout(() => {
          void pollRecord(mergedRecord.id);
        }, 1000);
        return;
      }

      if (mergedRecord.status === "done") {
        applyGenerationToBoard(mergedRecord);
        return;
      }

      setErrorMessage("Generation finished with an error response.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation request failed.";
      const failedRecord: GenerationRecord = {
        ...optimisticRecord,
        status: "error",
        completedAt: nowIso(),
        output: [
          {
            id: createId("media"),
            type: "text",
            content: message,
            mimeType: "text/plain",
            meta: { source: "request-error" },
          },
        ],
      };

      saveGeneration(failedRecord);
      refreshGenerations(failedRecord.id);
      setComposerStatus("error");
      setErrorMessage(message);
    }
  }

  function handleAddCard(type: CardType) {
    const nextCard = createCard(type, board?.cards.length ?? 0);

    updateBoard((current) => ({
      ...current,
      cards: [...current.cards, nextCard],
    }));

    setSelectedCardId(nextCard.id);
  }

  useEffect(() => {
    clearPollTimer();

    if (!boardId) {
      setBoard(null);
      setBoards([]);
      setRecords([]);
      setSelectedCardId(null);
      setSelectedGenerationId(null);
      return;
    }

    const loadedBoard = loadBoard(boardId);
    setBoard(loadedBoard);
    refreshBoards();
    refreshGenerations();
    setSelectedCardId(
      loadedBoard?.cards.find((card) => card.type === "prompt")?.id ??
        loadedBoard?.cards[0]?.id ??
        null,
    );
    setComposerStatus("idle");
    setErrorMessage(null);
  }, [boardId]);

  useEffect(() => {
    if (!board) {
      return;
    }

    saveBoard(board);
    refreshBoards();
  }, [board]);

  useEffect(() => {
    return () => {
      clearPollTimer();
    };
  }, []);

  if (!boardId || !board) {
    return (
      <section className="panel board-editor__missing">
        <p className="section-label">Board editor</p>
        <h1>Board not found</h1>
        <p>Create a new board from the dashboard or return to an existing one.</p>
        <Link className="button" to="/">
          Back to dashboard
        </Link>
      </section>
    );
  }

  const selectedGeneration =
    records.find((record) => record.id === selectedGenerationId) ?? records[0] ?? null;
  const promptCard =
    board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
    board.cards.find((card) => card.type === "prompt") ??
    null;

  return (
    <section className="board-editor">
      <Sidebar
        boardName={board.name}
        boardDescription={board.description}
        boards={boards}
        currentBoardId={board.id}
        cards={board.cards}
        selectedCardId={selectedCardId}
        onBoardNameChange={(value) =>
          updateBoard((current) => ({
            ...current,
            name: value || "Untitled Board",
          }))
        }
        onBoardDescriptionChange={(value) =>
          updateBoard((current) => ({
            ...current,
            description: value,
          }))
        }
        onSelectCard={setSelectedCardId}
        onAddCard={handleAddCard}
      />

      <div className="board-editor__main">
        <BoardCanvas
          cards={board.cards}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          onMoveCard={(cardId, position) =>
            updateBoard((current) => ({
              ...current,
              cards: current.cards.map((card) =>
                card.id === cardId ? { ...card, position } : card,
              ),
            }))
          }
          onChangeCardContent={(cardId, content) =>
            updateBoard((current) => ({
              ...current,
              cards: current.cards.map((card) =>
                card.id === cardId ? { ...card, content } : card,
              ),
            }))
          }
        />

        <div className="board-editor__panels">
          <PromptBlock
            promptValue={promptCard?.content ?? ""}
            onPromptChange={(value) => {
              if (!promptCard) {
                return;
              }

              updateBoard((current) => ({
                ...current,
                cards: current.cards.map((card) =>
                  card.id === promptCard.id ? { ...card, content: value } : card,
                ),
              }));
            }}
            model={model}
            provider={provider}
            onModelChange={setModel}
            onProviderChange={setProvider}
            onSubmit={() => void handleSubmitGeneration()}
            onCreatePromptCard={() => {
              handleAddCard("prompt");
            }}
            hasPromptCard={Boolean(promptCard)}
            status={selectedGeneration?.status ?? composerStatus}
            errorMessage={errorMessage}
          />
          <MediaOutputPanel record={selectedGeneration} />
          <HistoryTray
            records={records}
            selectedGenerationId={selectedGenerationId}
            onSelect={setSelectedGenerationId}
          />
        </div>
      </div>
    </section>
  );
}

export default BoardEditor;
