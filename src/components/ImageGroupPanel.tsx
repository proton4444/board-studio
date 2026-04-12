import { useEffect, useState } from "react";
import {
  deleteImageGroup,
  loadImageGroups,
  saveImageGroup,
  updateImageGroup,
} from "../lib/storage";
import { createId, nowIso } from "../lib/utils";
import type { ImageGroup, ReferenceImage } from "../schemas/media";

type ImageGroupPanelProps = {
  boardId: string;
  referenceImages: ReferenceImage[];
  refreshKey?: number;
  items?: ImageGroup[];
  onGroupChange?: () => void;
};

function ImageGroupPanel({
  boardId,
  referenceImages,
  refreshKey = 0,
  items,
  onGroupChange,
}: ImageGroupPanelProps) {
  const [groups, setGroups] = useState<ImageGroup[]>(() => items ?? []);
  const [groupName, setGroupName] = useState("");
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items) {
      return;
    }

    setGroups(loadImageGroups(boardId));
  }, [boardId, items, refreshKey]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};

    (items ?? groups).forEach((group) => {
      nextDrafts[group.id] = group.name;
    });

    setDraftNames(nextDrafts);
  }, [groups, items]);

  const displayedGroups = items ?? groups;

  function refreshGroups() {
    if (items) {
      return;
    }

    setGroups(loadImageGroups(boardId));
  }

  function handleToggleReference(referenceImageId: string, checked: boolean) {
    setSelectedReferenceIds((current) => {
      if (checked) {
        return current.includes(referenceImageId) ? current : [...current, referenceImageId];
      }

      return current.filter((id) => id !== referenceImageId);
    });
  }

  function handleCreateGroup() {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      return;
    }

    const timestamp = nowIso();

    saveImageGroup({
      id: createId("image-group"),
      boardId,
      name: trimmedName,
      referenceImageIds: selectedReferenceIds,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    setGroupName("");
    setSelectedReferenceIds([]);
    refreshGroups();
    onGroupChange?.();
  }

  function handleRenameGroup(group: ImageGroup) {
    const trimmedName = (draftNames[group.id] ?? group.name).trim();

    if (!trimmedName || trimmedName === group.name) {
      return;
    }

    updateImageGroup(group.id, {
      name: trimmedName,
      updatedAt: nowIso(),
    });
    refreshGroups();
    onGroupChange?.();
  }

  function handleRemoveMember(group: ImageGroup, referenceImageId: string) {
    updateImageGroup(group.id, {
      referenceImageIds: group.referenceImageIds.filter((id) => id !== referenceImageId),
      updatedAt: nowIso(),
    });
    refreshGroups();
    onGroupChange?.();
  }

  function handleDeleteGroup(groupId: string) {
    deleteImageGroup(groupId);
    refreshGroups();
    onGroupChange?.();
  }

  function resolveReferenceName(referenceImageId: string): string {
    const match = referenceImages.find((image) => image.id === referenceImageId);
    return match?.name ?? `Missing reference (${referenceImageId})`;
  }

  return (
    <section className="panel image-group-panel">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">Image groups</p>
          <h2>Reference bundles</h2>
        </div>
      </div>

      <div className="image-group-form">
        <label className="field">
          <span>Group name</span>
          <input
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Storyboard cast"
            type="text"
            value={groupName}
          />
        </label>
        <div className="field">
          <span>Select references</span>
          {referenceImages.length === 0 ? (
            <div className="panel__empty">
              <p>Upload references in the gallery above before creating a group.</p>
            </div>
          ) : (
            <div className="image-group-form__options">
              {referenceImages.map((image) => (
                <label className="image-group-form__option" key={image.id}>
                  <input
                    checked={selectedReferenceIds.includes(image.id)}
                    onChange={(event) => handleToggleReference(image.id, event.target.checked)}
                    type="checkbox"
                  />
                  <img alt={image.name} src={image.url} />
                  <span>{image.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          className="button"
          disabled={groupName.trim().length === 0}
          onClick={handleCreateGroup}
          type="button"
        >
          Create group
        </button>
      </div>

      {displayedGroups.length === 0 ? (
        <div className="panel__empty">
          <p>No groups yet. Select references above and create a named group.</p>
        </div>
      ) : (
        <div className="image-group-list">
          {displayedGroups.map((group) => (
            <article className="image-group-card" key={group.id}>
              <label className="field">
                <span>Group name</span>
                <input
                  onChange={(event) =>
                    setDraftNames((current) => ({
                      ...current,
                      [group.id]: event.target.value,
                    }))
                  }
                  type="text"
                  value={draftNames[group.id] ?? group.name}
                />
              </label>
              {group.referenceImageIds.length === 0 ? (
                <div className="panel__empty">
                  <p>No references selected for this group yet.</p>
                </div>
              ) : (
                <ol className="image-group-card__members">
                  {group.referenceImageIds.map((referenceImageId) => (
                    <li key={`${group.id}:${referenceImageId}`}>
                      <span>{resolveReferenceName(referenceImageId)}</span>
                      <button
                        className="button button--ghost"
                        onClick={() => handleRemoveMember(group, referenceImageId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="image-group-card__actions">
                <button
                  className="button button--ghost"
                  disabled={(draftNames[group.id] ?? group.name).trim().length === 0}
                  onClick={() => handleRenameGroup(group)}
                  type="button"
                >
                  Rename
                </button>
                <button className="button button--ghost" onClick={() => handleDeleteGroup(group.id)} type="button">
                  Delete group
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ImageGroupPanel;
