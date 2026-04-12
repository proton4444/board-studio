import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BoardCanvas from "../components/BoardCanvas";
import CollageEditorModal from "../components/CollageEditorModal";
import HistoryTray from "../components/HistoryTray";
import ImageGroupPanel from "../components/ImageGroupPanel";
import MediaOutputPanel from "../components/MediaOutputPanel";
import PromptBlock from "../components/PromptBlock";
import ReferenceGalleryPanel from "../components/ReferenceGalleryPanel";
import ScriptPanel from "../components/ScriptPanel";
import ReferenceUploadPanel from "../components/ReferenceUploadPanel";
import Sidebar from "../components/Sidebar";
import {
  buildImageGenParams,
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  pollGenerationStatus,
  requestGeneration,
  waitForGeneration,
} from "../lib/api";
import { getProvider, type BalanceFetchState } from "../lib/provider";
import { LOW_BALANCE_THRESHOLD } from "../lib/providers/atlasCloudProvider";
import {
  appendReferenceNamesToPrompt,
  getOrderedGroupReferenceImages,
  getOrderedGroupReferenceNames,
  isDataUrl,
  selectVideoReferenceImageUrl,
} from "../lib/multiref";
import {
  exportGenerationsByBoard,
  listBoards,
  listGenerationsByBoard,
  loadBoard,
  loadImageGroups,
  loadReferenceImages,
  loadScript,
  saveBoard,
  saveGeneration,
  saveScript,
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
import type { Script, Shot } from "../schemas/script";

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
  const [balanceFetchState, setBalanceFetchState] = useState<BalanceFetchState>({
    status: "idle",
  });
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [imageGroups, setImageGroups] = useState<ImageGroup[]>([]);
  const [selectedReferenceGroupId, setSelectedReferenceGroupId] = useState("");
  const [lastSelectedImageUrl, setLastSelectedImageUrl] = useState<string | null>(null);
  const [referenceGalleryRefreshKey, setReferenceGalleryRefreshKey] = useState(0);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const [showCollageEditor, setShowCollageEditor] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numOutputs, setNumOutputs] = useState(1);
  const [duration, setDuration] = useState(5);
  const [script, setScript] = useState<Script | null>(null);
  const [shotGenerationStatus, setShotGenerationStatus] = useState<
    Record<string, "pending" | "running" | "done" | "failed">
  >({});
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const exportLinkRef = useRef<HTMLAnchorElement | null>(null);
  const exportScriptLinkRef = useRef<HTMLAnchorElement | null>(null);

  function refreshBoards() {
    setBoards(listBoards().map(({ id, name }) => ({ id, name })));
  }

  async function fetchBalance() {
    const provider = getProvider(ATLAS_PROVIDER);

    if (!provider.getBalance) {
      setBalanceFetchState({
        status: "unavailable",
        reason: "Provider does not support balance queries.",
      });
      return;
    }

    setBalanceFetchState({ status: "loading" });

    try {
      const balance = await provider.getBalance();

      if (balance) {
        setBalanceFetchState({ status: "loaded", balance });
      } else {
        setBalanceFetchState({
          status: "unavailable",
          reason: "Balance endpoint returned no data.",
        });
      }
    } catch {
      setBalanceFetchState({
        status: "unavailable",
        reason: "Balance fetch failed.",
      });
    }
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
      await waitForGeneration(initialRecord.id);
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

  async function handleGenerateShot(shot: Shot): Promise<string | null> {
    if (!board) {
      return null;
    }

    const promptCard =
      board.cards.find((card) => card.id === selectedCardId && card.type === "prompt") ??
      board.cards.find((card) => card.type === "prompt");

    if (!promptCard) {
      setErrorMessage("A prompt card is required before shot generation can start.");
      setShotGenerationStatus((current) => ({ ...current, [shot.id]: "failed" }));
      return null;
    }

    if (!shot.prompt.trim()) {
      setShotGenerationStatus((current) => ({ ...current, [shot.id]: "failed" }));
      return null;
    }

    const selectedGroup =
      shot.referenceGroupId
        ? imageGroups.find((group) => group.id === shot.referenceGroupId) ?? null
        : null;
    const referenceImagesById = Object.fromEntries(
      referenceImages.map((image) => [image.id, image]),
    ) as Record<string, ReferenceImage | undefined>;
    const referenceImageUrl = selectedGroup
      ? selectVideoReferenceImageUrl(selectedGroup, referenceImagesById)
      : undefined;
    const canGenerateVideo = Boolean(
      selectedGroup &&
        referenceImageUrl &&
        !isDataUrl(referenceImageUrl),
    );

    setShotGenerationStatus((current) => ({ ...current, [shot.id]: "running" }));

    try {
      const initialRecord = canGenerateVideo
        ? await requestGeneration({
            type: "video",
            boardId: board.id,
            cardId: promptCard.id,
            prompt: shot.prompt,
            model: ATLASCLOUD_VIDEO_MODEL,
            imageUrl: referenceImageUrl!,
            duration: shot.duration ?? duration,
            referenceGroupId: selectedGroup?.id,
            referenceImageIds: selectedGroup?.referenceImageIds,
          })
        : await requestGeneration({
            type: "image",
            boardId: board.id,
            cardId: promptCard.id,
            prompt: shot.prompt,
            model: ATLASCLOUD_IMAGE_MODEL,
            referenceGroupId: selectedGroup?.id,
            referenceImageIds: selectedGroup?.referenceImageIds,
            aspect_ratio: aspectRatio,
            num_outputs: 1,
          });
      const finalRecord = await resolveGenerationLifecycle(initialRecord);

      if (finalRecord.status === "succeeded") {
        setScript((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((currentShot) =>
                  currentShot.id === shot.id
                    ? {
                        ...currentShot,
                        outputGenerationId: finalRecord.id,
                        updatedAt: nowIso(),
                      }
                    : currentShot,
                ),
                updatedAt: nowIso(),
              }
            : current,
        );
        setShotGenerationStatus((current) => ({ ...current, [shot.id]: "done" }));
        return finalRecord.id;
      }

      setShotGenerationStatus((current) => ({ ...current, [shot.id]: "failed" }));
      return null;
    } catch {
      setShotGenerationStatus((current) => ({ ...current, [shot.id]: "failed" }));
      return null;
    }
  }

  async function handleGenerateAllShots() {
    const shotsToGenerate =
      script?.shots
        .filter((currentShot) => currentShot.prompt.trim().length > 0)
        .sort((left, right) => left.order - right.order) ?? [];

    if (shotsToGenerate.length === 0 || isBulkGenerating) {
      return;
    }

    setIsBulkGenerating(true);

    const initialStatus: Record<string, "pending" | "running" | "done" | "failed"> = {};
    shotsToGenerate.forEach((currentShot) => {
      initialStatus[currentShot.id] = "pending";
    });
    setShotGenerationStatus(initialStatus);

    try {
      for (const currentShot of shotsToGenerate) {
        setShotGenerationStatus((current) => ({ ...current, [currentShot.id]: "running" }));
        const resultId = await handleGenerateShot(currentShot).catch(() => null);
        setShotGenerationStatus((current) => ({
          ...current,
          [currentShot.id]: resultId ? "done" : "failed",
        }));
      }
    } finally {
      setIsBulkGenerating(false);
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
      const initialRecord = await requestGeneration(
        buildImageGenParams(promptCard, {
          boardId: board.id,
          prompt: submissionPrompt,
          model: ATLASCLOUD_IMAGE_MODEL,
          referenceGroupId: selectedGroup?.id,
          referenceImageIds: selectedGroup?.referenceImageIds,
          aspect_ratio: aspectRatio,
          num_outputs: numOutputs,
        }),
      );
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
        duration,
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

    const referenceImageUrl = lastSelectedImageUrl ?? imageUrl;

    setBusyAction("video");
    setErrorMessage(null);

    try {
      const initialRecord = await requestGeneration({
        type: "video",
        boardId: board.id,
        cardId: sourceRecord.cardId,
        prompt: sourceRecord.prompt,
        model: ATLASCLOUD_VIDEO_MODEL,
        provider: ATLAS_PROVIDER,
        imageUrl: referenceImageUrl,
        duration,
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
      setLastSelectedImageUrl(null);
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

  function handleDeleteCard(cardId: string) {
    if (activeGeneration?.cardId === cardId) {
      setErrorMessage("Cannot delete a card while a generation is running.");
      return;
    }

    updateBoard((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== cardId),
    }));

    if (selectedCardId === cardId) {
      setSelectedCardId(null);
    }
  }

  function handleExportBoard() {
    if (!boardId || !board) {
      return;
    }

    saveBoard(board);

    const storedBoard = loadBoard(boardId);

    if (!storedBoard) {
      setErrorMessage("Unable to export this board because it could not be loaded from storage.");
      return;
    }

    const generations = JSON.parse(exportGenerationsByBoard(boardId)) as GenerationRecord[];
    const downloadPayload = JSON.stringify(
      {
        board: storedBoard,
        generations,
      },
      null,
      2,
    );
    const filename = `board-${storedBoard.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;
    const blob = new Blob([downloadPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    if (exportLinkRef.current) {
      exportLinkRef.current.href = url;
      exportLinkRef.current.download = filename;
      exportLinkRef.current.click();
    }

    globalThis.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function handleExportScript() {
    if (!script) {
      return;
    }

    const json = JSON.stringify(script, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const filename = `script-${script.name.replace(/\s+/g, "-").toLowerCase()}-export.json`;

    if (exportScriptLinkRef.current) {
      exportScriptLinkRef.current.href = url;
      exportScriptLinkRef.current.download = filename;
      exportScriptLinkRef.current.click();
    }

    globalThis.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  }

  useEffect(() => {
    if (!boardId) {
      setBoard(null);
      setBoards([]);
      setRecords([]);
      setBalanceFetchState({ status: "idle" });
      setReferenceImages([]);
      setImageGroups([]);
      setSelectedCardId(null);
      setSelectedGenerationId(null);
      setSelectedReferenceGroupId("");
      setLastSelectedImageUrl(null);
      setActiveGeneration(null);
      setBusyAction(null);
      setShowCollageEditor(false);
      setScript(null);
      setShotGenerationStatus({});
      setIsBulkGenerating(false);
      return;
    }

    const loadedBoard = loadBoard(boardId);
    setBoard(loadedBoard);
    setScript(loadScript(boardId));
    setShotGenerationStatus({});
    setIsBulkGenerating(false);
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
    setLastSelectedImageUrl(null);
    setShowCollageEditor(false);
    refreshReferenceGallery();
    void fetchBalance();
  }, [boardId]);

  useEffect(() => {
    setLastSelectedImageUrl(null);
  }, [selectedGenerationId]);

  useEffect(() => {
    if (!board) {
      return;
    }

    saveBoard(board);
    refreshBoards();
  }, [board]);

  useEffect(() => {
    if (script) {
      saveScript(script);
    }
  }, [script]);

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
  const lowBalanceWarning =
    balanceFetchState.status === "loaded" &&
    balanceFetchState.balance.available < LOW_BALANCE_THRESHOLD
      ? `Low balance (${balanceFetchState.balance.available} ${balanceFetchState.balance.unit}) — add credits before continuing.`
      : null;
  const promptErrorMessage = errorMessage ?? lowBalanceWarning ?? promptCardState?.errorMessage ?? null;
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
        onExportBoard={handleExportBoard}
        balanceFetchState={balanceFetchState}
        onRefreshBalance={() => void fetchBalance()}
      />

      <div className="board-editor__main">
        <a
          aria-hidden="true"
          className="board-editor__download-link"
          hidden
          ref={exportLinkRef}
        />
        <a
          aria-hidden="true"
          className="board-editor__download-link"
          hidden
          ref={exportScriptLinkRef}
        />
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
          onDeleteCard={handleDeleteCard}
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
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            numOutputs={numOutputs}
            onNumOutputsChange={setNumOutputs}
            duration={duration}
            onDurationChange={setDuration}
            showVideoParameters={Boolean(selectedReferenceGroupId)}
          />
          <MediaOutputPanel
            record={displayedGeneration}
            isCreatingVideo={busyAction === "video"}
            panelErrorMessage={errorMessage ?? displayedGeneration?.error ?? null}
            groupNameById={groupNameById}
            onMakeVideo={(record, imageUrl) => {
              void handleMakeVideo(record, imageUrl);
            }}
            onUseAsVideoReference={(url) => {
              setLastSelectedImageUrl(url);
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
              onOpenCollageEditor={() => setShowCollageEditor(true)}
              refreshKey={referenceGalleryRefreshKey}
            />
            <ImageGroupPanel
              boardId={board.id}
              onGroupChange={refreshImageGroups}
              referenceImages={referenceImages}
              refreshKey={groupRefreshKey}
            />
            <ScriptPanel
              boardId={board.id}
              script={script}
              groups={imageGroups}
              defaultDuration={duration}
              shotGenerationStatus={shotGenerationStatus}
              isBulkGenerating={isBulkGenerating}
              onScriptChange={setScript}
              onGenerateShot={(shot) => void handleGenerateShot(shot)}
              onGenerateAll={() => void handleGenerateAllShots()}
              onExportScript={handleExportScript}
            />
            <HistoryTray
              records={records}
              selectedGenerationId={selectedGenerationId}
              onSelect={setSelectedGenerationId}
              groupNameById={groupNameById}
            />
          </div>
        </div>

        <CollageEditorModal
          boardId={board.id}
          onClose={() => setShowCollageEditor(false)}
          onSave={refreshReferenceGallery}
          open={showCollageEditor}
          referenceImages={referenceImages}
        />
      </div>
    </section>
  );
}

export default BoardEditor;
