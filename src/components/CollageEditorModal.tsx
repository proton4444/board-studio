import { useEffect, useRef, useState } from "react";
import { saveReferenceImage } from "../lib/storage";
import { createId, nowIso } from "../lib/utils";
import type { ReferenceImage } from "../schemas/media";

const GRID_OPTIONS = [
  "1×1 — single",
  "1×2 — side by side",
  "2×1 — stacked",
  "2×2 — four up",
  "1×3 — row of three",
  "3×1 — column of three",
  "2×3 — six up",
  "3×2 — six up wide",
] as const;

type CollageEditorModalProps = {
  open: boolean;
  onClose: () => void;
  boardId: string;
  referenceImages: ReferenceImage[];
  onSave: () => void;
};

export function selectDefaultGrid(count: number): string {
  if (count <= 1) return "1×1 — single";
  if (count === 2) return "1×2 — side by side";
  if (count === 3) return "1×3 — row of three";
  if (count === 4) return "2×2 — four up";
  if (count <= 6) return "2×3 — six up";
  return "3×2 — six up wide";
}

export function parseGridSize(value: string): { cols: number; rows: number } {
  const match = value.match(/^(\d+)×(\d+)/);

  if (!match) {
    return { cols: 1, rows: 1 };
  }

  return { cols: Number(match[1]), rows: Number(match[2]) };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function CollageEditorModal({
  open,
  onClose,
  boardId,
  referenceImages,
  onSave,
}: CollageEditorModalProps) {
  const [selectedImages, setSelectedImages] = useState<ReferenceImage[]>([]);
  const [gridSize, setGridSize] = useState(() => selectDefaultGrid(0));
  const [outputSize, setOutputSize] = useState("1024");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const userChangedGrid = useRef(false);

  useEffect(() => {
    if (!open) {
      setSelectedImages([]);
      setGridSize(selectDefaultGrid(0));
      setOutputSize("1024");
      setIsSaving(false);
      setSaveError(null);
      userChangedGrid.current = false;
    }
  }, [open]);

  useEffect(() => {
    setSelectedImages((current) =>
      current.filter((image) => referenceImages.some((candidate) => candidate.id === image.id)),
    );
  }, [referenceImages]);

  useEffect(() => {
    if (!userChangedGrid.current) {
      setGridSize(selectDefaultGrid(selectedImages.length));
    }

    userChangedGrid.current = false;
  }, [selectedImages.length]);

  function handleToggleSelection(image: ReferenceImage) {
    setSaveError(null);
    setSelectedImages((current) => {
      const existingIndex = current.findIndex((item) => item.id === image.id);

      if (existingIndex >= 0) {
        return current.filter((item) => item.id !== image.id);
      }

      return [...current, image];
    });
  }

  function handleMoveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= selectedImages.length) {
      return;
    }

    setSaveError(null);
    setSelectedImages((current) => {
      const nextImages = [...current];
      const [movedImage] = nextImages.splice(index, 1);

      nextImages.splice(nextIndex, 0, movedImage);
      return nextImages;
    });
  }

  async function handleSaveCollage() {
    if (selectedImages.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { cols, rows } = parseGridSize(gridSize);
      const outputPixels = Number(outputSize);
      const canvas = document.createElement("canvas");
      canvas.width = outputPixels;
      canvas.height = outputPixels;

      const context = canvas.getContext("2d");

      if (!context) {
        setSaveError("Canvas compositing is unavailable in this browser.");
        return;
      }

      const maxCells = Math.min(selectedImages.length, cols * rows);
      const cellWidth = outputPixels / cols;
      const cellHeight = outputPixels / rows;
      let drawnImages = 0;

      for (let index = 0; index < maxCells; index += 1) {
        const image = selectedImages[index];

        try {
          const loadedImage = await loadImage(image.url);
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;
          const scaleX = cellWidth / loadedImage.naturalWidth;
          const scaleY = cellHeight / loadedImage.naturalHeight;
          const scale = Math.max(scaleX, scaleY);
          const drawWidth = loadedImage.naturalWidth * scale;
          const drawHeight = loadedImage.naturalHeight * scale;
          const offsetX = (drawWidth - cellWidth) / 2;
          const offsetY = (drawHeight - cellHeight) / 2;

          context.save();
          context.beginPath();
          context.rect(x, y, cellWidth, cellHeight);
          context.clip();
          context.drawImage(loadedImage, x - offsetX, y - offsetY, drawWidth, drawHeight);
          context.restore();
          drawnImages += 1;
        } catch (error) {
          console.error("Failed to load collage source image", error);
        }
      }

      if (drawnImages === 0) {
        setSaveError("Unable to load the selected images for collage creation.");
        return;
      }

      const createdAt = nowIso();
      const collageImage: ReferenceImage = {
        id: createId("ref"),
        boardId,
        type: "image",
        url: canvas.toDataURL("image/png"),
        name: `Collage ${createdAt.slice(0, 10)}`,
        createdAt,
        meta: {},
      };

      saveReferenceImage(collageImage);
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save collage", error);
      setSaveError("Failed to save collage.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="collage-modal"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="collage-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="collage-modal__header">
          <div>
            <p className="panel__eyebrow">Reference tools</p>
            <h2>Create a collage</h2>
          </div>
          <button
            className="button button--ghost"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="collage-modal__body">
          <aside className="collage-modal__picker">
            {referenceImages.length === 0 ? (
              <div className="panel__empty">
                <p>Upload reference images first.</p>
              </div>
            ) : (
              <div className="collage-picker-grid">
                {referenceImages.map((image) => {
                  const selectedIndex = selectedImages.findIndex((item) => item.id === image.id);
                  const isSelected = selectedIndex >= 0;

                  return (
                    <button
                      className={`collage-picker-tile${isSelected ? " collage-picker-tile--selected" : ""}`}
                      key={image.id}
                      onClick={() => handleToggleSelection(image)}
                      type="button"
                    >
                      {isSelected ? (
                        <span className="collage-picker-tile__badge">{selectedIndex + 1}</span>
                      ) : null}
                      <img
                        alt={image.name}
                        src={image.url}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="collage-modal__arrangement">
            <section>
              <p className="panel__eyebrow">Arrangement</p>
              {selectedImages.length === 0 ? (
                <div className="panel__empty">
                  <p>Select reference images to build the collage.</p>
                </div>
              ) : (
                <div className="collage-arrangement__list">
                  {selectedImages.map((image, index) => (
                    <article
                      className="collage-arrangement__item"
                      key={image.id}
                    >
                      <img
                        alt={image.name}
                        src={image.url}
                      />
                      <div className="collage-arrangement__item-name">{image.name}</div>
                      <div className="collage-arrangement__reorder">
                        {index > 0 ? (
                          <button
                            className="button button--ghost"
                            onClick={() => handleMoveImage(index, -1)}
                            type="button"
                          >
                            ↑
                          </button>
                        ) : null}
                        {index < selectedImages.length - 1 ? (
                          <button
                            className="button button--ghost"
                            onClick={() => handleMoveImage(index, 1)}
                            type="button"
                          >
                            ↓
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <label className="field collage-modal__grid-select">
              <span>Grid layout</span>
              <select
                onChange={(event) => {
                  userChangedGrid.current = true;
                  setGridSize(event.target.value);
                }}
                value={gridSize}
              >
                {GRID_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field collage-modal__size-select">
              <span>Output size</span>
              <select
                onChange={(event) => setOutputSize(event.target.value)}
                value={outputSize}
              >
                <option value="512">512</option>
                <option value="1024">1024</option>
                <option value="2048">2048</option>
              </select>
            </label>

            <div className="collage-modal__status">
              {isSaving ? <p>Saving…</p> : null}
              {saveError ? <p className="panel__error">{saveError}</p> : null}
            </div>
          </div>
        </div>

        <div className="collage-modal__footer">
          <button
            className="button button--ghost"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button"
            disabled={selectedImages.length === 0 || isSaving}
            onClick={() => void handleSaveCollage()}
            type="button"
          >
            Save collage
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollageEditorModal;
