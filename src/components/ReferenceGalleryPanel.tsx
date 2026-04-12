/*
Plan:
1. Load persisted reference images for the active board on mount and whenever uploads/removals change.
2. Render a thumbnail grid with filename metadata and a remove action for each image.
3. Allow SSR tests to pass fixture items directly so the gallery markup can be verified without DOM APIs.
*/
import { useEffect, useState } from "react";
import { deleteReferenceImage, loadReferenceImages } from "../lib/storage";
import { formatShortDate } from "../lib/utils";
import type { ReferenceImage } from "../schemas/media";

type ReferenceGalleryPanelProps = {
  boardId: string;
  refreshKey?: number;
  items?: ReferenceImage[];
};

function ReferenceGalleryPanel({ boardId, refreshKey = 0, items }: ReferenceGalleryPanelProps) {
  const [references, setReferences] = useState<ReferenceImage[]>(() => items ?? []);

  useEffect(() => {
    if (items) {
      return;
    }

    setReferences(loadReferenceImages(boardId));
  }, [boardId, items, refreshKey]);

  const displayedItems = items ?? references;

  function handleRemove(imageId: string) {
    deleteReferenceImage(imageId);
    setReferences(loadReferenceImages(boardId));
  }

  return (
    <section className="panel reference-gallery">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">Reference gallery</p>
          <h2>Board references</h2>
        </div>
      </div>
      {displayedItems.length === 0 ? (
        <div className="panel__empty">
          <p>Upload reference images to build a reusable thumbnail gallery for this board.</p>
        </div>
      ) : (
        <div className="reference-gallery__grid">
          {displayedItems.map((item) => (
            <article className="reference-tile" key={item.id}>
              <img alt={item.name} className="reference-tile__image" src={item.url} />
              <div className="reference-tile__meta">
                <div>
                  <strong>{item.name}</strong>
                  <p>{formatShortDate(item.createdAt)}</p>
                </div>
                <button
                  className="button button--ghost"
                  onClick={() => handleRemove(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReferenceGalleryPanel;
