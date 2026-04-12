import type { GenerationStatus } from "../schemas/media";

type PromptBlockProps = {
  promptValue: string;
  onPromptChange: (value: string) => void;
  model: string;
  provider: string;
  onModelChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onSubmit: () => void;
  onCreatePromptCard: () => void;
  hasPromptCard: boolean;
  status: GenerationStatus | "idle";
  errorMessage: string | null;
};

function PromptBlock({
  promptValue,
  onPromptChange,
  model,
  provider,
  onModelChange,
  onProviderChange,
  onSubmit,
  onCreatePromptCard,
  hasPromptCard,
  status,
  errorMessage,
}: PromptBlockProps) {
  const canSubmit =
    hasPromptCard &&
    promptValue.trim().length > 0 &&
    status !== "pending" &&
    status !== "running";

  return (
    <section className="panel prompt-block">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">Prompt block</p>
          <h2>Generation input</h2>
        </div>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>
      {!hasPromptCard ? (
        <div className="prompt-block__empty">
          <p>Create a prompt card first so the board has a canonical source for generation input.</p>
          <button className="button button--ghost" onClick={onCreatePromptCard} type="button">
            Add prompt card
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Prompt</span>
            <textarea
              value={promptValue}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Describe your target image, video, or text output."
            />
          </label>
          <div className="prompt-block__grid">
            <label className="field">
              <span>Model</span>
              <input value={model} onChange={(event) => onModelChange(event.target.value)} />
            </label>
            <label className="field">
              <span>Provider</span>
              <input value={provider} onChange={(event) => onProviderChange(event.target.value)} />
            </label>
          </div>
          <button
            className="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            type="button"
          >
            Submit generation
          </button>
          {errorMessage ? <p className="panel__error">{errorMessage}</p> : null}
        </>
      )}
    </section>
  );
}

export default PromptBlock;
