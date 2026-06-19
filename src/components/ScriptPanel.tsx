import { createId, nowIso } from "../lib/utils";
import type { ImageGroup } from "../schemas/media";
import type { Script, Shot } from "../schemas/script";

type ShotGenerationState = "pending" | "running" | "done" | "failed";

type ScriptPanelProps = {
  boardId: string;
  script: Script | null;
  groups: ImageGroup[];
  defaultDuration: number;
  shotGenerationStatus: Record<string, ShotGenerationState>;
  isBulkGenerating: boolean;
  onScriptChange: (script: Script) => void;
  onGenerateShot: (shot: Shot) => void;
  onGenerateAll: () => void;
  onExportScript: () => void;
};

function mapShotStatus(status: ShotGenerationState): "pending" | "processing" | "succeeded" | "failed" {
  switch (status) {
    case "running":
      return "processing";
    case "done":
      return "succeeded";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

function reassignShotOrder(shots: Shot[]): Shot[] {
  return shots.map((shot, index) => ({
    ...shot,
    order: index,
  }));
}

function ScriptPanel({
  boardId,
  script,
  groups,
  defaultDuration,
  shotGenerationStatus,
  isBulkGenerating,
  onScriptChange,
  onGenerateShot,
  onGenerateAll,
  onExportScript,
}: ScriptPanelProps) {
  function createNewScript() {
    const timestamp = nowIso();

    onScriptChange({
      id: createId("script"),
      boardId,
      name: "Shot script",
      shots: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (!script) {
    return (
      <section className="panel script-panel">
        <div className="panel__heading">
          <div>
            <p className="panel__eyebrow">Shot script</p>
            <h2>Script assistant</h2>
          </div>
        </div>
        <div className="panel__empty">
          <p>Plan your shoot with a shot script. Each shot maps to a generation.</p>
          <button className="button button--ghost" onClick={createNewScript} type="button">
            New script
          </button>
        </div>
      </section>
    );
  }

  const currentScript: Script = script;

  function commitScript(nextScript: Script) {
    onScriptChange({
      ...nextScript,
      updatedAt: nowIso(),
    });
  }

  function updateShot(shotId: string, patch: Partial<Shot>) {
    commitScript({
      ...currentScript,
      shots: currentScript.shots.map((shot) =>
        shot.id === shotId
          ? {
              ...shot,
              ...patch,
              updatedAt: nowIso(),
            }
          : shot,
      ),
    });
  }

  function removeShot(shotId: string) {
    commitScript({
      ...currentScript,
      shots: reassignShotOrder(currentScript.shots.filter((shot) => shot.id !== shotId)).map((shot) => ({
        ...shot,
        updatedAt: nowIso(),
      })),
    });
  }

  function addShot() {
    const timestamp = nowIso();

    commitScript({
      ...currentScript,
      shots: [
        ...currentScript.shots,
        {
          id: createId("shot"),
          boardId,
          scriptId: currentScript.id,
          order: currentScript.shots.length,
          prompt: "",
          duration: defaultDuration,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });
  }

  const orderedShots = [...currentScript.shots].sort((left, right) => left.order - right.order);
  const shotsWithPrompts = orderedShots.filter((shot) => shot.prompt.trim().length > 0).length;

  return (
    <section className="panel script-panel">
      <div className="panel__heading">
        <div className="field">
          <span>Script name</span>
          <input
            onChange={(event) =>
              commitScript({
                ...currentScript,
                name: event.target.value,
              })
            }
            type="text"
            value={currentScript.name}
          />
        </div>
        <div className="media-output-panel__actions">
          <button className="button button--ghost" onClick={onExportScript} type="button">
            Export
          </button>
          <button
            className="button"
            disabled={isBulkGenerating || shotsWithPrompts === 0}
            onClick={onGenerateAll}
            type="button"
          >
            Generate all
          </button>
        </div>
      </div>

      <div className="script-shot-list">
        {orderedShots.map((shot) => {
          const label = [shot.act?.trim(), shot.scene?.trim()].filter(Boolean).join(" · ");
          const rawStatus = shotGenerationStatus[shot.id];
          const mappedStatus = rawStatus ? mapShotStatus(rawStatus) : null;

          return (
            <article className="script-shot" key={shot.id}>
              <div className="script-shot__header">
                <span className="script-shot__order">#{shot.order + 1}</span>
                {label ? <span className="script-shot__label">{label}</span> : null}
                {mappedStatus ? (
                  <span className={`status-pill status-pill--${mappedStatus}`}>{mappedStatus}</span>
                ) : null}
                <button
                  className="button button--ghost"
                  onClick={() => removeShot(shot.id)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <textarea
                className="script-shot__prompt"
                onChange={(event) => updateShot(shot.id, { prompt: event.target.value })}
                placeholder="Describe this shot…"
                value={shot.prompt}
              />

              <details className="script-shot__details">
                <summary>Details</summary>
                <div className="script-shot__detail-grid">
                  <label className="field">
                    <span>Act</span>
                    <input
                      onChange={(event) => updateShot(shot.id, { act: event.target.value || undefined })}
                      type="text"
                      value={shot.act ?? ""}
                    />
                  </label>
                  <label className="field">
                    <span>Scene</span>
                    <input
                      onChange={(event) => updateShot(shot.id, { scene: event.target.value || undefined })}
                      type="text"
                      value={shot.scene ?? ""}
                    />
                  </label>
                  <label className="field">
                    <span>Reference group</span>
                    <select
                      onChange={(event) =>
                        updateShot(shot.id, {
                          referenceGroupId: event.target.value || undefined,
                        })
                      }
                      value={shot.referenceGroupId ?? ""}
                    >
                      <option value="">None</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {`${group.name} (${group.referenceImageIds.length})`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Duration</span>
                    <select
                      onChange={(event) =>
                        updateShot(shot.id, {
                          duration: Number(event.target.value),
                        })
                      }
                      value={String(shot.duration ?? defaultDuration)}
                    >
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="7">7 seconds</option>
                      <option value="10">10 seconds</option>
                    </select>
                  </label>
                  <label className="field script-shot__detail-field--full">
                    <span>Notes</span>
                    <textarea
                      onChange={(event) => updateShot(shot.id, { notes: event.target.value || undefined })}
                      value={shot.notes ?? ""}
                    />
                  </label>
                </div>
              </details>

              <div className="script-shot__footer">
                {shot.outputGenerationId ? (
                  <span className="script-shot__linked">✓ Linked to output</span>
                ) : (
                  <span />
                )}
                <button
                  className="button"
                  disabled={isBulkGenerating || shot.prompt.trim().length === 0}
                  onClick={() => onGenerateShot(shot)}
                  type="button"
                >
                  Generate
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button className="button button--ghost" onClick={addShot} type="button">
        Add shot
      </button>
    </section>
  );
}

export default ScriptPanel;
