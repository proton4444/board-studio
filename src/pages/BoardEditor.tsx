import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BoardCanvas from "../components/BoardCanvas";
import HistoryTray from "../components/HistoryTray";
import ImageGroupPanel from "../components/ImageGroupPanel";
import MediaOutputPanel from "../components/MediaOutputPanel";
import PromptBlock from "../components/PromptBlock";
import ReferenceGalleryPanel from "../components/ReferenceGalleryPanel";
import ReferenceUploadPanel from "../components/ReferenceUploadPanel";
import Sidebar from "../components/Sidebar";
import { mergePredictionIntoGenerationRecord, pollGenerationStatus, requestGeneration } from "../lib/api";
import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  generateVideo,
  waitForCompletion,
} from "../lib/atlascloud";
import {
  appendReferenceNamesToPrompt,
  getOrderedGroupReferenceImages,
  getOrderedGroupReferenceNames,
  isDataUrl,
  selectVideoReferenceImageUrl,
} from "../lib/multiref";
import {
  listBoards,
  listGenerationsByBoard,
  loadBoard,
  loadImageGroups,
  loadReferenceImages,
  saveBoard,
  saveGeneration,
} from "../lib/storage";
import { createId, nowIso } from "../lib/utils";
import type { Board, Card, CardType } from "../schemas/board";
import type {
  GenerationRecord,
  GenerationStatus,
  ImageGroup,
  MediaItem,
  ReferenceImage,
} from "../schemas/media";

type ComposerStatus = GenerationStatus | "idle";

type ActiveGeneration = {
  recordId: string;
  cardId: string;
  status: GenerationStatus;
  errorMessage?: string;
} | null;

type CardGenerationState = {
  status: GenerationStatus;
  errorMessage?: string;
};

const ATLAS_PROVIDER = "atlas-cloud";

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

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildCardGenerationStateById(
  records: GenerationRecord[],
  activeGeneration: ActiveGeneration,
): Record<string, CardGenerationState> {
  const nextState: Record<string, CardGenerationState> = {};

  records.forEach((record) => {
    if (!nextState[record.cardId]) {
      nextState[record.cardId] = {
        status: record.status,
        errorMessage: record.error,
      };
    }
  });

  if (activeGeneration) {
    nextState[activeGeneration.cardId] = {
      status: activeGeneration.status,
      errorMessage:
        activeGeneration.errorMessage ?? nextState[activeGeneration.cardId]?.errorMessage,
    };
  }

  return nextState;
}

function BoardEditor() {
  const { boardId } = useParams();
  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [activeGeneration, setActiveGeneration] = useState<ActiveGeneration>(null);
  const [busyAction, setBusyAction] = useState<"image" | "video" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [imageGroups, setImageGroups] = useState<ImageGroup[]>([]);
  const [selectedReferenceGroupId, setSelectedReferenceGroupId] = useState("");
  const [referenceGalleryRefreshKey, setReferenceGalleryRefreshKey] = useState(0);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

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

  function refreshReferenceImages(nextBoardId = boardId) {
    if (!nextBoardId) {
      setReferenceImages([]);
      return;
    }

    setReferenceImages(loadReferenceImages(nextBoardId));
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

  function refreshReferenceGallery() {
    refreshReferenceImages();
    setReferenceGalleryRefreshKey((current) => current + 1);
  }

  function refreshImageGroups() {
    if (!boardId) {
      setImageGroups([]);
      setSelectedReferenceGroupId("");
      return;
    }

    const nextGroups = loadImageGroups(boardId);
    setImageGroups(nextGroups);
    setSelectedReferenceGroupId((current) =>
      current && nextGroups.some((group) => group.id === current) ? current : "",
    );
    setGroupRefreshKey((current) => current + 1);
  }

  function saveAndSelectRecord(record: GenerationRecord) {
    saveGeneration(record);
    refreshGenerations(record.id);
    setSelectedGenerationId(record.id);
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

  function buildFailedRecord(record: GenerationRecord, message: string): GenerationRecord {
    return {
      ...record,
      status: "failed",
      completedAt: nowIso(),
      error: message,
    };
  }

  async function resolveGenerationLifecycle(initialRecord: GenerationRecord): Promise<GenerationRecord> {
    saveAndSelectRecord(initialRecord);
    setActiveGeneration({
      recordId: initialRecord.id,
      cardId: initialRecord.cardId,
      status: initialRecord.status,
      errorMessage: initialRecord.error,
    });

    if (initialRecord.status === "succeeded" || initialRecord.status === "failed") {
      setActiveGeneration(null);
      return initialRecord;
    }

    setActiveGeneration({
      recordId: initialRecord.id,
      cardId: initialRecord.cardId,
      status: "processing",
    });

    try {
      await waitForCompletion(initialRecord.id);
      const finalRecord = await pollGenerationStatus(initialRecord.id);
      saveAndSelectRecord(finalRecord);
      return finalRecord;
    } catch (error) {
      const message = extractErrorMessage(error, "Generation failed.");
      const polledRecord = await pollGenerationStatus(initialRecord.id).catch(() => null);
      const failedRecord =
        polledRecord?.status === "failed"
          ? {
              ...polledRecord,
              error: polledRecord.error ?? message,
            }
          : buildFailedRecord(initialRecord, message);

      saveAndSelectRecord(failedRecord);
      return failedRecord;
    } finally {
      setActiveGeneration(null);
    }
  }

  async function handleSubmitGeneration() {
    if (!board || busyAction) {
      return;
    }

    const promptCard =
      board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
      board.cards.find((card) => card.type === "prompt");

    if (!promptCard || !promptCard.content.trim()) {
      setErrorMessage("A prompt card with text is required before generation can start.");
      return;
    }

    const selectedGroup =
      imageGroups.find((group) => group.id === selectedReferenceGroupId) ?? null;

    if (selectedReferenceGroupId && !selectedGroup) {
      setErrorMessage("The selected reference group is no longer available. Choose another group.");
      return;
    }

    if (selectedGroup && selectedGroup.referenceImageIds.length === 0) {
      setErrorMessage("The selected reference group is empty. Add at least one image before generating.");
      return;
    }

    const referenceImagesById = Object.fromEntries(
      referenceImages.map((image) => [image.id, image]),
    ) as Record<string, ReferenceImage | undefined>;
    const selectedGroupReferenceNames = selectedGroup
      ? getOrderedGroupReferenceNames(selectedGroup, referenceImagesById)
      : [];

    if (selectedGroup && selectedGroupReferenceNames.length === 0) {
      setErrorMessage("The selected reference group no longer has usable images. Rebuild the group and try again.");
      return;
    }

    const submissionPrompt = selectedGroup
      ? appendReferenceNamesToPrompt(promptCard.content.trim(), selectedGroupReferenceNames)
      : promptCard.content.trim();

    setBusyAction("image");
    setErrorMessage(null);

    try {
      const initialRecord = await requestGeneration({
        type: "image",
        prompt: submissionPrompt,
        model: ATLASCLOUD_IMAGE_MODEL,
        boardId: board.id,
        cardId: promptCard.id,
        referenceGroupId: selectedGroup?.id,
        referenceImageIds: selectedGroup?.referenceImageIds,
      });
      const finalRecord = await resolveGenerationLifecycle(initialRecord);

      if (finalRecord.status === "succeeded") {
        applyGenerationToBoard(finalRecord);
        return;
      }

      setErrorMessage(finalRecord.error ?? "Image generation failed.");
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Image generation request failed."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateVideoFromGroup() {
    if (!board || busyAction) {
      return;
    }

    const promptCard =
      board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
      board.cards.find((card) => card.type === "prompt");

    if (!promptCard || !promptCard.content.trim()) {
      setErrorMessage("A prompt card with text is required before generation can start.");
      return;
    }

    const selectedGroup =
      imageGroups.find((group) => group.id === selectedReferenceGroupId) ?? null;

    if (!selectedGroup) {
      setErrorMessage("Select a reference group before generating a video from group references.");
      return;
    }

    if (selectedGroup.referenceImageIds.length === 0) {
      setErrorMessage("The selected reference group is empty. Add at least one image before generating.");
      return;
    }

    const referenceImagesById = Object.fromEntries(
      referenceImages.map((image) => [image.id, image]),
    ) as Record<string, ReferenceImage | undefined>;
    const imageUrl = selectVideoReferenceImageUrl(selectedGroup, referenceImagesById);

    if (!imageUrl) {
      setErrorMessage("The selected reference group no longer has a usable first image. Rebuild the group and try again.");
      return;
    }

    if (isDataUrl(imageUrl)) {
      setErrorMessage(
        "Atlas Cloud video generation requires a remote hosted image URL, not a local data URL. Use an Atlas Cloud-generated image instead.",
      );
      return;
    }

    setBusyAction("video");
    setErrorMessage(null);

    try {
      const initialRecord = await requestGeneration({
        type: "video",
        prompt: promptCard.content.trim(),
        model: ATLASCLOUD_VIDEO_MODEL,
        boardId: board.id,
        cardId: promptCard.id,
        imageUrl,
        duration: 5,
        referenceGroupId: selectedGroup.id,
        referenceImageIds: selectedGroup.referenceImageIds,
      });
      const finalRecord = await resolveGenerationLifecycle(initialRecord);

      if (finalRecord.status === "succeeded") {
        applyGenerationToBoard(finalRecord);
        return;
      }

      setErrorMessage(finalRecord.error ?? "Video generation failed.");
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Video generation request failed."));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMakeVideo(sourceRecord: GenerationRecord, imageUrl: string) {
    if (!board || busyAction) {
      return;
    }

    setBusyAction("video");
    setErrorMessage(null);

    try {
      const prediction = await generateVideo({
        model: ATLASCLOUD_VIDEO_MODEL,
        image_url: imageUrl,
        prompt: sourceRecord.prompt,
        duration: 5,
      });
      const initialRecord = mergePredictionIntoGenerationRecord(
        {
          boardId: board.id,
          cardId: sourceRecord.cardId,
          prompt: sourceRecord.prompt,
          model: ATLASCLOUD_VIDEO_MODEL,
          provider: ATLAS_PROVIDER,
          mediaType: "video",
        },
        prediction,
      );
      const finalRecord = await resolveGenerationLifecycle(initialRecord);

      if (finalRecord.status === "succeeded") {
        applyGenerationToBoard(finalRecord);
        return;
      }

      setErrorMessage(finalRecord.error ?? "Video generation failed.");
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Video generation request failed."));
    } finally {
      setBusyAction(null);
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
    if (!boardId) {
      setBoard(null);
      setBoards([]);
      setRecords([]);
      setReferenceImages([]);
      setImageGroups([]);
      setSelectedCardId(null);
      setSelectedGenerationId(null);
      setSelectedReferenceGroupId("");
      setActiveGeneration(null);
      setBusyAction(null);
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
    refreshReferenceImages(boardId);
    refreshImageGroups();
    setActiveGeneration(null);
    setBusyAction(null);
    setErrorMessage(null);
    refreshReferenceGallery();
  }, [boardId]);

  useEffect(() => {
    if (!board) {
      return;
    }

    saveBoard(board);
    refreshBoards();
  }, [board]);

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
  const displayedGeneration =
    selectedGeneration && activeGeneration?.recordId === selectedGeneration.id
      ? {
          ...selectedGeneration,
          status: activeGeneration.status,
          error: activeGeneration.errorMessage ?? selectedGeneration.error,
        }
      : selectedGeneration;
  const promptCard =
    board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
    board.cards.find((card) => card.type === "prompt") ??
    null;
  const cardGenerationStateById = buildCardGenerationStateById(records, activeGeneration);
  const promptCardState = promptCard ? cardGenerationStateById[promptCard.id] : undefined;
  const composerStatus: ComposerStatus = promptCardState?.status ?? "idle";
  const promptErrorMessage = errorMessage ?? promptCardState?.errorMessage ?? null;
  const referenceImagesById = Object.fromEntries(
    referenceImages.map((image) => [image.id, image]),
  ) as Record<string, ReferenceImage | undefined>;
  const selectedReferenceGroup =
    imageGroups.find((group) => group.id === selectedReferenceGroupId) ?? null;
  const selectedGroupPreviewImages = selectedReferenceGroup
    ? getOrderedGroupReferenceImages(selectedReferenceGroup, referenceImagesById)
    : [];
  const groupNameById = Object.fromEntries(imageGroups.map((group) => [group.id, group.name])) as Record<
    string,
    string
  >;

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
          generationStateByCardId={cardGenerationStateById}
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
            model={ATLASCLOUD_IMAGE_MODEL}
            provider={ATLAS_PROVIDER}
            onSubmit={() => void handleSubmitGeneration()}
            onSubmitVideoFromGroup={() => void handleGenerateVideoFromGroup()}
            onCreatePromptCard={() => {
              handleAddCard("prompt");
            }}
            hasPromptCard={Boolean(promptCard)}
            status={composerStatus}
            isSubmitting={busyAction === "image"}
            isSubmittingVideo={busyAction === "video"}
            errorMessage={promptErrorMessage}
            groups={imageGroups}
            selectedGroupId={selectedReferenceGroupId}
            onSelectGroup={setSelectedReferenceGroupId}
            selectedGroupPreview={selectedGroupPreviewImages}
          />
          <MediaOutputPanel
            record={displayedGeneration}
            isCreatingVideo={busyAction === "video"}
            panelErrorMessage={errorMessage ?? displayedGeneration?.error ?? null}
            onMakeVideo={(record, imageUrl) => {
              void handleMakeVideo(record, imageUrl);
            }}
          />
          <div className="board-editor__panel-stack">
            <ReferenceUploadPanel
              boardId={board.id}
              onUploadComplete={refreshReferenceGallery}
            />
            <ReferenceGalleryPanel
              boardId={board.id}
              onChange={refreshReferenceGallery}
              refreshKey={referenceGalleryRefreshKey}
            />
            <ImageGroupPanel
              boardId={board.id}
              onGroupChange={refreshImageGroups}
              referenceImages={referenceImages}
              refreshKey={groupRefreshKey}
            />
            <HistoryTray
              records={records}
              selectedGenerationId={selectedGenerationId}
              onSelect={setSelectedGenerationId}
              groupNameById={groupNameById}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default BoardEditor;
