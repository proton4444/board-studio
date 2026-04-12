import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  generateImage,
  generateVideo,
  pollPrediction,
  uploadMedia,
  waitForCompletion,
  type PredictionResult,
} from "../atlascloud";
import {
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

const atlasCapabilities: ProviderCapabilities = {
  imageGeneration: true,
  videoGeneration: true,
  uploadMedia: true,
  trueMultiImageConditioning: false,
  referenceAssistedGeneration: true,
  aspectRatioControl: true,
  numOutputsControl: true,
  durationControl: true,
  seedControl: false,
};

function toProviderPollResult(result: PredictionResult): ProviderPollResult {
  return result;
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
    singleImageReference: true,
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

export default atlasCloudProvider;
