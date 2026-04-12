import { humaniseModelId } from "../lib/utils";
import type { MultiRefVideoCapabilityState } from "../lib/multiref";
import type { GenerationStatus, ImageGroup, ReferenceImage } from "../schemas/media";

type PromptBlockProps = {
  promptValue: string;
  onPromptChange: (value: string) => void;
  model: string;
  provider: string;
  onSubmit: () => void;
  onSubmitVideoFromGroup: () => void;
  videoGroupCapabilityState?: MultiRefVideoCapabilityState | null;
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
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  numOutputs: number;
  onNumOutputsChange: (value: number) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  seed: number | undefined;
  onSeedChange: (value: number | undefined) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (value: number) => void;
  outputFormat: string;
  onOutputFormatChange: (value: string) => void;
  showVideoParameters?: boolean;
};

function PromptBlock({
  promptValue,
  onPromptChange,
  model,
  provider,
  onSubmit,
  onSubmitVideoFromGroup,
  videoGroupCapabilityState,
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
  aspectRatio,
  onAspectRatioChange,
  numOutputs,
  onNumOutputsChange,
  duration,
  onDurationChange,
  seed,
  onSeedChange,
  guidanceScale,
  onGuidanceScaleChange,
  outputFormat,
  onOutputFormatChange,
  showVideoParameters,
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
  const shouldShowVideoParameters = showVideoParameters || selectedGroupId.length > 0;

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
              <input readOnly value={humaniseModelId(model)} />
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
                  {`${group.name} (${group.referenceImageIds.length})`}
                </option>
              ))}
            </select>
          </label>
          <details className="prompt-block__parameters">
            <summary>Generation parameters</summary>
            <div className="prompt-block__parameter-grid">
              <label className="field">
                <span>Aspect ratio</span>
                <select
                  onChange={(event) => onAspectRatioChange(event.target.value)}
                  value={aspectRatio}
                >
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="3:4">3:4</option>
                </select>
              </label>
              <label className="field">
                <span>Number of outputs</span>
                <select
                  onChange={(event) => onNumOutputsChange(Number(event.target.value))}
                  value={String(numOutputs)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>
              {shouldShowVideoParameters ? (
                <label className="field">
                  <span>Video duration (seconds)</span>
                  <select
                    onChange={(event) => onDurationChange(Number(event.target.value))}
                    value={String(duration)}
                  >
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="7">7</option>
                    <option value="10">10</option>
                  </select>
                </label>
              ) : null}
            </div>
            <details className="prompt-block__advanced">
              <summary>Advanced parameters</summary>
              <div className="prompt-block__parameter-grid">
                <label className="field">
                  <span>Seed (empty = random)</span>
                  <input
                    type="number"
                    min="0"
                    max="4294967295"
                    placeholder="Random"
                    value={seed ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      onSeedChange(raw === "" ? undefined : Math.max(0, Math.trunc(Number(raw))));
                    }}
                  />
                </label>
                <label className="field">
                  <span>Guidance scale</span>
                  <select
                    value={String(guidanceScale)}
                    onChange={(event) => onGuidanceScaleChange(Number(event.target.value))}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="7">7 (default)</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                </label>
                <label className="field">
                  <span>Output format</span>
                  <select
                    value={outputFormat}
                    onChange={(event) => onOutputFormatChange(event.target.value)}
                  >
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </label>
              </div>
            </details>
          </details>
          <p className="prompt-block__hint">
            Tip: reference group names will be included in your prompt to help guide the image model.
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
              {isSubmittingVideo ? "Making video..." : "Video from Group"}
            </button>
            {videoGroupCapabilityState && selectedGroupId.length > 0 ? (
              <span
                className={`prompt-block__video-cap-hint prompt-block__video-cap-hint--${videoGroupCapabilityState.path}`}
                title={videoGroupCapabilityState.reason}
              >
                {videoGroupCapabilityState.path === "multi-ref" && "True multi-ref"}
                {videoGroupCapabilityState.path === "upload-then-multi-ref" &&
                  "Upload + multi-ref"}
                {videoGroupCapabilityState.path === "bridge" && "Bridge (first image)"}
                {videoGroupCapabilityState.path === "unavailable" && "Video unavailable"}
              </span>
            ) : null}
          </div>
          {errorMessage ? <p className="panel__error">{errorMessage}</p> : null}
        </>
      )}
    </section>
  );
}

export default PromptBlock;
