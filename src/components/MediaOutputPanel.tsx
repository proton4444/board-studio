import { formatShortDate } from "../lib/utils";
import type { GenerationRecord } from "../schemas/media";

type MediaOutputPanelProps = {
  record: GenerationRecord | null;
};

function MediaOutputPanel({ record }: MediaOutputPanelProps) {
  return (
    <section className="panel media-output-panel">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">Output viewer</p>
          <h2>Latest result</h2>
        </div>
        {record ? <span className={`status-pill status-pill--${record.status}`}>{record.status}</span> : null}
      </div>
      {!record ? (
        <div className="panel__empty">
          <p>Select a generation from history to inspect its output.</p>
        </div>
      ) : (
        <>
          <div className="media-output-panel__meta">
            <span>{record.provider}</span>
            <span>{record.model}</span>
            <span>{formatShortDate(record.createdAt)}</span>
          </div>
          <p className="media-output-panel__prompt">{record.prompt}</p>
          <div className="media-output-panel__items">
            {record.output?.length ? (
              record.output.map((item) => (
                <article className="media-tile" key={item.id}>
                  <p className="media-tile__label">{item.type}</p>
                  {item.type === "image" && item.url ? (
                    <img alt="Generated output" className="media-tile__visual" src={item.url} />
                  ) : null}
                  {item.type === "video" && item.url ? (
                    <video className="media-tile__visual" controls src={item.url} />
                  ) : null}
                  {item.type === "text" ? (
                    <pre className="media-tile__text">{item.content ?? "No text output"}</pre>
                  ) : null}
                  {!item.url && item.type !== "text" ? (
                    <div className="media-tile__placeholder">No URL returned</div>
                  ) : null}
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
