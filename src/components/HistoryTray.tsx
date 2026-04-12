import { formatShortDate } from "../lib/utils";
import type { GenerationRecord } from "../schemas/media";

type HistoryTrayProps = {
  records: GenerationRecord[];
  selectedGenerationId: string | null;
  onSelect: (generationId: string) => void;
};

function HistoryTray({
  records,
  selectedGenerationId,
  onSelect,
}: HistoryTrayProps) {
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
        <div className="history-tray__list">
          {records.map((record) => {
            const preview = record.output?.[0];

            return (
              <button
                className={`history-item${selectedGenerationId === record.id ? " is-selected" : ""}`}
                key={record.id}
                onClick={() => onSelect(record.id)}
                type="button"
              >
                <div className="history-item__thumb">
                  {preview?.type === "image" && preview.url ? (
                    <img alt="" src={preview.url} />
                  ) : (
                    <span>{preview?.type ?? record.status}</span>
                  )}
                </div>
                <div className="history-item__body">
                  <div className="history-item__row">
                    <strong>{record.model}</strong>
                    <span className={`status-pill status-pill--${record.status}`}>{record.status}</span>
                  </div>
                  <p>{record.prompt}</p>
                  <small>{formatShortDate(record.createdAt)}</small>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HistoryTray;
