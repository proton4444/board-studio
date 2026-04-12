import { useState } from "react";
import { formatShortDate, humaniseModelId, truncate } from "../lib/utils";
import type { GenerationRecord } from "../schemas/media";

type HistoryTrayProps = {
  records: GenerationRecord[];
  selectedGenerationId: string | null;
  onSelect: (generationId: string) => void;
  groupNameById: Record<string, string>;
};

type HistoryFilter = "all" | "image" | "video";
type HistoryMediaType = "image" | "video" | "run";

function getHistoryMediaType(record: GenerationRecord): HistoryMediaType {
  const firstOutputType = record.output?.[0]?.type;

  if (firstOutputType === "image") {
    return "image";
  }

  if (firstOutputType === "video") {
    return "video";
  }

  return "run";
}

function getGroupAssistedType(record: GenerationRecord): "group-assisted image" | "group-assisted video" | null {
  if (!record.referenceGroupId) {
    return null;
  }

  if (record.model === "google/nano-banana/text-to-image") {
    return "group-assisted image";
  }

  if (record.model === "bytedance/seedance-2.0-fast/image-to-video") {
    return "group-assisted video";
  }

  return null;
}

function HistoryTray({
  records,
  selectedGenerationId,
  onSelect,
  groupNameById,
}: HistoryTrayProps) {
  const [filter, setFilter] = useState<HistoryFilter>("all");

  return (
    <section className="panel history-tray">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">History tray</p>
          <h2>Board runs</h2>
        </div>
      </div>
      {records.length === 0 ? (
        <div className="panel__empty">
          <p>Generation history will appear here after you submit the first run.</p>
        </div>
      ) : (
        <>
          <div className="history-tray__filter">
            <button
              className={`button button--ghost${filter === "all" ? " is-active" : ""}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              All
            </button>
            <button
              className={`button button--ghost${filter === "image" ? " is-active" : ""}`}
              onClick={() => setFilter("image")}
              type="button"
            >
              Images
            </button>
            <button
              className={`button button--ghost${filter === "video" ? " is-active" : ""}`}
              onClick={() => setFilter("video")}
              type="button"
            >
              Videos
            </button>
          </div>
          <div className="history-tray__list">
            {records.map((record) => {
              const preview = record.output?.[0];
              const mediaType = getHistoryMediaType(record);
              const isVisible = filter === "all" || mediaType === filter;
              const groupName = record.referenceGroupId
                ? groupNameById[record.referenceGroupId] ?? "Unknown group"
                : null;
              const groupAssistedType = getGroupAssistedType(record);

              return (
                <button
                  className={`history-item${selectedGenerationId === record.id ? " is-selected" : ""}${
                    isVisible ? "" : " history-item--filtered-out"
                  }`}
                  key={record.id}
                  onClick={() => onSelect(record.id)}
                  type="button"
                >
                  <div className="history-item__thumb">
                    {preview?.type === "image" && preview.url ? (
                      <img alt="" src={preview.url} />
                    ) : mediaType === "video" ? (
                      <span>▶ video</span>
                    ) : (
                      <span>{record.status}</span>
                    )}
                  </div>
                  <div className="history-item__body">
                    <div className="history-item__row">
                      <strong>{humaniseModelId(record.model)}</strong>
                      <div className="history-item__meta-pills">
                        <span className={`status-pill status-pill--${record.status}`}>{record.status}</span>
                        <span className={`type-badge type-badge--${mediaType}`}>{mediaType}</span>
                      </div>
                    </div>
                    <p>{truncate(record.prompt, 80)}</p>
                    {groupName ? (
                      <div className="history-item__group">
                        {groupAssistedType ? (
                          <span
                            className={`type-badge type-badge--${
                              groupAssistedType === "group-assisted image" ? "image" : "video"
                            }`}
                          >
                            {groupAssistedType}
                          </span>
                        ) : null}
                        <small>{`Group: ${groupName}`}</small>
                      </div>
                    ) : null}
                    <small>{formatShortDate(record.createdAt)}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default HistoryTray;
