import type { GenerationStatus, ImageGroup, ReferenceImage } from "../schemas/media";

type PromptBlockProps = {
  promptValue: string;
  onPromptChange: (value: string) => void;
  model: string;
  provider: string;
  onSubmit: () => void;
  onSubmitVideoFromGroup: () => void;
  onCreatePromptCard: () => void;
  hasPromptCard: boolean;
  status: GenerationStatus | "idle";
  isSubmitting: boolean;
  isSubmittingVideo: boolean;
  errorMessage: string | null;
  groups: ImageGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  selectedGroupPreview: Array<Pick<ReferenceImage, "id" | "name" | "url">>;
};

function PromptBlock({
  promptValue,
  onPromptChange,
  model,
  provider,
  onSubmit,
  onSubmitVideoFromGroup,
  onCreatePromptCard,
  hasPromptCard,
  status,
  isSubmitting,
  isSubmittingVideo,
  errorMessage,
  groups,
  selectedGroupId,
  onSelectGroup,
  selectedGroupPreview,
}: PromptBlockProps) {
  const canSubmit =
    hasPromptCard &&
    promptValue.trim().length > 0 &&
    status !== "pending" &&
    status !== "processing" &&
    !isSubmitting;
  const canSubmitVideoFromGroup =
    hasPromptCard &&
    promptValue.trim().length > 0 &&
    selectedGroupId.length > 0 &&
    status !== "pending" &&
    status !== "processing" &&
    !isSubmittingVideo;

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
          <label className="field">
            <span>Reference group</span>
            <select
              onChange={(event) => onSelectGroup(event.target.value)}
              value={selectedGroupId}
            >
              <option value="">None</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <p className="prompt-block__hint">
            Atlas Cloud image generation does not accept image inputs. When a group is selected, board-studio appends
            its reference names to the prompt as a best-effort hint.
          </p>
          {selectedGroupId ? (
            selectedGroupPreview.length > 0 ? (
              <div className="prompt-block__group-preview">
                {selectedGroupPreview.map((image, index) => (
                  <article className="prompt-block__group-member" key={image.id}>
                    <img alt={image.name} src={image.url} />
                    <div>
                      <strong>
                        {index + 1}. {image.name}
                      </strong>
                      {index === 0 ? <small>Used as `image_url` for group-based video generation.</small> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel__empty">
                <p>This group has no available reference previews.</p>
              </div>
            )
          ) : null}
          <div className="prompt-block__actions">
            <button
              className="button"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {isSubmitting ? "Generating..." : "Generate"}
            </button>
            <button
              className="button button--ghost"
              disabled={!canSubmitVideoFromGroup}
              onClick={onSubmitVideoFromGroup}
              type="button"
            >
              {isSubmittingVideo ? "Making video..." : "Generate Video from Group"}
            </button>
          </div>
          {errorMessage ? <p className="panel__error">{errorMessage}</p> : null}
        </>
      )}
    </section>
  );
}

export default PromptBlock;
