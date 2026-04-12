import type { PredictionResult } from "./atlascloud";

export type ProviderImageParams = {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
  seed?: number;
  guidance_scale?: number;
  output_format?: string;
};

export type ProviderVideoParams = {
  model: string;
  image_url?: string;
  reference_images?: string[];
  prompt?: string;
  duration?: number;
};

export type ProviderPollResult = PredictionResult;

export type BalanceInfo = {
  available: number;
  unit: string;
  raw: unknown;
};

export type BalanceFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; balance: BalanceInfo }
  | { status: "unavailable"; reason: string };

export type ProviderCapabilities = {
  imageGeneration: boolean;
  videoGeneration: boolean;
  uploadMedia: boolean;
  trueMultiImageConditioning: boolean;
  multiRefVideo: boolean;
  referenceAssistedGeneration: boolean;
  aspectRatioControl: boolean;
  numOutputsControl: boolean;
  durationControl: boolean;
  seedControl: boolean;
};

export type ModelCapabilityProfile = {
  modelId: string;
  providerId: string;
  generationType: "image" | "video";
  capabilities: {
    aspectRatio: boolean;
    numOutputs: boolean;
    durationControl: boolean;
    trueMultiImageInput: boolean;
    multiRefVideo: boolean;
    singleImageReference: boolean;
    promptAugmentation: boolean;
  };
};

export interface GenerationProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  generateImage(params: ProviderImageParams): Promise<ProviderPollResult>;
  generateVideo(params: ProviderVideoParams): Promise<ProviderPollResult>;
  uploadMedia?(imageUrl: string): Promise<string>;
  getBalance?(): Promise<BalanceInfo | null>;
  poll(id: string): Promise<ProviderPollResult>;
  waitForCompletion(
    id: string,
    opts?: { intervalMs?: number; maxWaitMs?: number },
  ): Promise<ProviderPollResult>;
}

const providerRegistry: Record<string, GenerationProvider> = {};

export function registerProvider(provider: GenerationProvider): void {
  providerRegistry[provider.id] = provider;
}

export function getProvider(id: string): GenerationProvider {
  const provider = providerRegistry[id];

  if (!provider) {
    throw new Error(
      `Unknown generation provider: "${id}". Register it with registerProvider() first.`,
    );
  }

  return provider;
}

export function listProviders(): GenerationProvider[] {
  return Object.values(providerRegistry);
}

const modelProfileRegistry: ModelCapabilityProfile[] = [];

export function registerModelProfile(profile: ModelCapabilityProfile): void {
  modelProfileRegistry.push(profile);
}

export function getModelProfile(modelId: string): ModelCapabilityProfile | undefined {
  return modelProfileRegistry.find((profile) => profile.modelId === modelId);
}

export function listModelProfiles(): ModelCapabilityProfile[] {
  return [...modelProfileRegistry];
}
