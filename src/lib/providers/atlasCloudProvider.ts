import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_REF_VIDEO_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  generateImage,
  generateRefVideo,
  generateVideo,
  pollPrediction,
  uploadMedia,
  waitForCompletion,
  type PredictionResult,
} from "../atlascloud";
import {
  type BalanceInfo,
  type GenerationProvider,
  type ModelCapabilityProfile,
  type ProviderCapabilities,
  type ProviderImageParams,
  type ProviderPollResult,
  type ProviderVideoParams,
  registerModelProfile,
  registerProvider,
} from "../provider";

export const ATLAS_CLOUD_PROVIDER_ID = "atlas-cloud" as const;
export const LOW_BALANCE_THRESHOLD = 100;

const atlasCapabilities: ProviderCapabilities = {
  imageGeneration: true,
  videoGeneration: true,
  uploadMedia: true,
  trueMultiImageConditioning: false,
  multiRefVideo: false,
  referenceAssistedGeneration: true,
  aspectRatioControl: true,
  numOutputsControl: true,
  durationControl: true,
  seedControl: false,
};

function toProviderPollResult(result: PredictionResult): ProviderPollResult {
  return result;
}

export function normalizeBalanceResponse(raw: unknown): BalanceInfo | null {
  const isRec = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  const payload =
    isRec(raw) && isRec((raw as Record<string, unknown>).data)
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : isRec(raw)
        ? (raw as Record<string, unknown>)
        : null;

  if (!payload) {
    return null;
  }

  const amount =
    typeof payload.balance === "number"
      ? payload.balance
      : typeof payload.credits === "number"
        ? payload.credits
        : typeof payload.available === "number"
          ? payload.available
          : typeof payload.available_credits === "number"
            ? payload.available_credits
            : typeof payload.remaining === "number"
              ? payload.remaining
              : null;

  if (amount === null) {
    return null;
  }

  const unit =
    typeof payload.unit === "string"
      ? payload.unit
      : typeof payload.currency === "string"
        ? payload.currency
        : "credits";

  return { available: amount, unit, raw: payload };
}

const atlasImageModelProfile: ModelCapabilityProfile = {
  modelId: ATLASCLOUD_IMAGE_MODEL,
  providerId: ATLAS_CLOUD_PROVIDER_ID,
  generationType: "image",
  capabilities: {
    aspectRatio: true,
    numOutputs: true,
    durationControl: false,
    trueMultiImageInput: false,
    multiRefVideo: false,
    singleImageReference: false,
    promptAugmentation: true,
  },
};

const atlasVideoModelProfile: ModelCapabilityProfile = {
  modelId: ATLASCLOUD_VIDEO_MODEL,
  providerId: ATLAS_CLOUD_PROVIDER_ID,
  generationType: "video",
  capabilities: {
    aspectRatio: false,
    numOutputs: false,
    durationControl: true,
    trueMultiImageInput: false,
    multiRefVideo: false,
    singleImageReference: true,
    promptAugmentation: false,
  },
};

const atlasRefVideoModelProfile: ModelCapabilityProfile = {
  modelId: ATLASCLOUD_REF_VIDEO_MODEL,
  providerId: ATLAS_CLOUD_PROVIDER_ID,
  generationType: "video",
  capabilities: {
    aspectRatio: false,
    numOutputs: false,
    durationControl: true,
    trueMultiImageInput: true,
    multiRefVideo: true,
    singleImageReference: false,
    promptAugmentation: false,
  },
};

export const atlasCloudProvider: GenerationProvider = {
  id: ATLAS_CLOUD_PROVIDER_ID,
  name: "Atlas Cloud",
  capabilities: atlasCapabilities,
  async generateImage(params: ProviderImageParams): Promise<ProviderPollResult> {
    return toProviderPollResult(
      await generateImage({
        model: params.model as typeof ATLASCLOUD_IMAGE_MODEL,
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio,
        num_outputs: params.num_outputs,
        seed: params.seed,
        guidance_scale: params.guidance_scale,
        output_format: params.output_format,
      }),
    );
  },
  async generateVideo(params: ProviderVideoParams): Promise<ProviderPollResult> {
    if (
      params.model === ATLASCLOUD_REF_VIDEO_MODEL &&
      params.reference_images &&
      params.reference_images.length > 0
    ) {
      return toProviderPollResult(
        await generateRefVideo({
          model: ATLASCLOUD_REF_VIDEO_MODEL,
          reference_images: params.reference_images,
          prompt: params.prompt,
          duration: params.duration,
        }),
      );
    }

    if (!params.image_url) {
      throw new Error("Atlas Cloud image-to-video requires image_url.");
    }

    return toProviderPollResult(
      await generateVideo({
        model: params.model as typeof ATLASCLOUD_VIDEO_MODEL,
        image_url: params.image_url,
        prompt: params.prompt,
        duration: params.duration,
      }),
    );
  },
  async uploadMedia(imageUrl: string): Promise<string> {
    return uploadMedia(imageUrl);
  },
  async getBalance(): Promise<BalanceInfo | null> {
    try {
      const proxyBase = (import.meta.env as { VITE_ATLAS_PROXY_BASE?: string }).VITE_ATLAS_PROXY_BASE?.trim() ?? "";
      const response = await fetch(`${proxyBase}/api/atlas/account/balance`);

      if (!response.ok) {
        return null;
      }

      const raw = (await response.json()) as unknown;
      return normalizeBalanceResponse(raw);
    } catch {
      return null;
    }
  },
  async poll(id: string): Promise<ProviderPollResult> {
    return toProviderPollResult(await pollPrediction(id));
  },
  async waitForCompletion(
    id: string,
    opts?: { intervalMs?: number; maxWaitMs?: number },
  ): Promise<ProviderPollResult> {
    return toProviderPollResult(await waitForCompletion(id, opts));
  },
};

registerProvider(atlasCloudProvider);
registerModelProfile(atlasImageModelProfile);
registerModelProfile(atlasVideoModelProfile);
registerModelProfile(atlasRefVideoModelProfile);

export default atlasCloudProvider;
