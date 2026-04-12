import { formatShortDate, humaniseModelId } from "../lib/utils";
import type { GenerationRecord, MediaItem } from "../schemas/media";

type MediaOutputPanelProps = {
  record: GenerationRecord | null;
  isCreatingVideo: boolean;
  panelErrorMessage: string | null;
  onMakeVideo: (record: GenerationRecord, imageUrl: string) => void;
  groupNameById?: Record<string, string>;
  onUseAsVideoReference?: (url: string) => void;
};

function renderMediaContent(item: MediaItem) {
  const itemType = item.type;

  if (itemType === "image" && item.url) {
    return <img alt="Generated output" className="media-tile__visual" src={item.url} />;
  }

  if (itemType === "video" && item.url) {
    return <video className="media-tile__visual" controls src={item.url} />;
  }

  if (itemType === "text") {
    return <pre className="media-tile__text">{item.content ?? item.url ?? "No text output"}</pre>;
  }

  if (item.content) {
    return <pre className="media-tile__text">{item.content}</pre>;
  }

  if (item.url) {
    return <pre className="media-tile__text">{item.url}</pre>;
  }

  return <div className="media-tile__placeholder">No media payload returned</div>;
}

function MediaOutputPanel({
  record,
  isCreatingVideo,
  panelErrorMessage,
  onMakeVideo,
  groupNameById = {},
  onUseAsVideoReference,
}: MediaOutputPanelProps) {
  const imageOutput = record?.output?.find((item) => item.type === "image" && item.url);
  const canMakeVideo =
    Boolean(record) &&
    record?.status === "succeeded" &&
    imageOutput?.url &&
    record.model === "google/nano-banana/text-to-image";
  const groupName = record?.referenceGroupId
    ? groupNameById[record.referenceGroupId] ?? "Unknown group"
    : null;

  return (
    <section className="panel media-output-panel">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">Output viewer</p>
          <h2>Latest result</h2>
        </div>
        <div className="media-output-panel__actions">
          {canMakeVideo && imageOutput?.url ? (
            <button
              className="button button--ghost"
              disabled={isCreatingVideo}
              onClick={() => onMakeVideo(record, imageOutput.url!)}
              type="button"
            >
              {isCreatingVideo ? "Generating video…" : "Make Video"}
            </button>
          ) : null}
          {record ? (
            <span className={`status-pill status-pill--${record.status}`}>{record.status}</span>
          ) : null}
        </div>
      </div>
      {!record ? (
        <div className="panel__empty">
          <p>Select a generation from history to inspect its output.</p>
        </div>
      ) : (
        <>
          <div className="media-output-panel__meta">
            <span>{record.provider}</span>
            <span>{humaniseModelId(record.model)}</span>
            {groupName ? <span>{`Group: ${groupName}`}</span> : null}
            <span>{formatShortDate(record.createdAt)}</span>
          </div>
          <p className="media-output-panel__prompt">{record.prompt}</p>
          {panelErrorMessage ? <p className="panel__error">{panelErrorMessage}</p> : null}
          <div className="media-output-panel__items">
            {record.output?.length ? (
              record.output.map((item) => (
                <article className="media-tile" key={item.id}>
                  <p className="media-tile__label">{item.type}</p>
                  {renderMediaContent(item)}
                  <div className="media-tile__actions">
                    {item.type === "image" && item.url && onUseAsVideoReference ? (
                      <button
                        className="button button--ghost"
                        onClick={() => onUseAsVideoReference(item.url!)}
                        type="button"
                      >
                        Use as reference
                      </button>
                    ) : null}
                    {item.url ? (
                      <a className="button button--ghost media-tile__download" download href={item.url}>
                        Download
                      </a>
                    ) : null}
                  </div>
                  {item.mimeType ? <p className="media-tile__meta">{item.mimeType}</p> : null}
                </article>
              ))
            ) : (
              <div className="panel__empty">
                <p>No media payload was returned for this generation.</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default MediaOutputPanel;
