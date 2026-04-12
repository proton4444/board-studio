import type { GenerationStatus } from "../schemas/media";

type PromptBlockProps = {
  promptValue: string;
  onPromptChange: (value: string) => void;
  model: string;
  provider: string;
  onSubmit: () => void;
  onCreatePromptCard: () => void;
  hasPromptCard: boolean;
  status: GenerationStatus | "idle";
  isSubmitting: boolean;
  errorMessage: string | null;
};

function PromptBlock({
  promptValue,
  onPromptChange,
  model,
  provider,
  onSubmit,
  onCreatePromptCard,
  hasPromptCard,
  status,
  isSubmitting,
  errorMessage,
}: PromptBlockProps) {
  const canSubmit =
    hasPromptCard &&
    promptValue.trim().length > 0 &&
    status !== "pending" &&
    status !== "processing" &&
    !isSubmitting;

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
              <input readOnly value={model} />
            </label>
            <label className="field">
              <span>Provider</span>
              <input readOnly value={provider} />
            </label>
          </div>
          <button
            className="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting ? "Generating..." : "Generate"}
          </button>
          {errorMessage ? <p className="panel__error">{errorMessage}</p> : null}
        </>
      )}
    </section>
  );
}

export default PromptBlock;
