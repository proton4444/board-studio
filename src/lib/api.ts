import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  type PredictionResult,
} from "./atlascloud";
import { getProvider, type ProviderPollResult } from "./provider";
import { loadGeneration } from "./storage";
import { createId, nowIso } from "./utils";
import type { Card } from "../schemas/board";
import type { GenerationRecord, GenerationStatus, MediaItem } from "../schemas/media";
import "./providers/atlasCloudProvider";

const ATLAS_PROVIDER = "atlas-cloud";

type BaseGenerationParams = {
  boardId: string;
  cardId: string;
  model: string;
  provider?: string;
  referenceGroupId?: string;
  referenceImageIds?: string[];
};

type ImageGenerationParams = BaseGenerationParams & {
  type: "image";
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
};

type VideoGenerationParams = BaseGenerationParams & {
  type: "video";
  prompt: string;
  imageUrl: string;
  duration?: number;
};

export type GenerationRequestParams = ImageGenerationParams | VideoGenerationParams;

export { ATLASCLOUD_IMAGE_MODEL, ATLASCLOUD_VIDEO_MODEL } from "./atlascloud";

type BuildImageGenOptions = Omit<
  ImageGenerationParams,
  "type" | "cardId" | "prompt"
> & {
  prompt?: string;
};

type GenerationRecordContext = {
  boardId: string;
  cardId: string;
  prompt: string;
  model: string;
  provider: string;
  mediaType: MediaItem["type"];
  referenceGroupId?: string;
  referenceImageIds?: string[];
  createdAt?: string;
};

function toMediaType(model: string): MediaItem["type"] {
  return model === ATLASCLOUD_VIDEO_MODEL ? "video" : "image";
}

function toGenerationStatus(status: PredictionResult["status"]): GenerationStatus {
  return status;
}

function buildOutput(recordId: string, mediaType: MediaItem["type"], urls?: string[]): MediaItem[] | undefined {
  if (!urls?.length) {
    return undefined;
  }

  return urls.map((url, index) => ({
    id: `${recordId}_output_${index}`,
    type: mediaType,
    url,
    mimeType: mediaType === "video" ? "video/mp4" : "image/png",
    meta: {
      source: "atlas-cloud",
      index,
    },
  }));
}

export function mergePredictionIntoGenerationRecord(
  context: GenerationRecordContext,
  prediction: PredictionResult,
): GenerationRecord {
  const status = toGenerationStatus(prediction.status);
  const createdAt = context.createdAt ?? nowIso();
  const completedAt =
    status === "succeeded" || status === "failed" ? nowIso() : undefined;

  return {
    id: prediction.id,
    boardId: context.boardId,
    cardId: context.cardId,
    prompt: context.prompt,
    model: context.model,
    provider: context.provider,
    referenceGroupId: context.referenceGroupId,
    referenceImageIds: context.referenceImageIds,
    status,
    createdAt,
    completedAt,
    error: prediction.error,
    output: buildOutput(prediction.id, context.mediaType, prediction.output),
  };
}

function getStoredContext(record: GenerationRecord): GenerationRecordContext {
  return {
    boardId: record.boardId,
    cardId: record.cardId,
    prompt: record.prompt,
    model: record.model,
    provider: record.provider,
    referenceGroupId: record.referenceGroupId,
    referenceImageIds: record.referenceImageIds,
    mediaType:
      record.output?.[0]?.type && record.output[0].type !== "text"
        ? record.output[0].type
        : toMediaType(record.model),
    createdAt: record.createdAt,
  };
}

export function buildImageGenParams(
  promptCard: Pick<Card, "id" | "content">,
  options: BuildImageGenOptions,
): ImageGenerationParams {
  return {
    type: "image",
    boardId: options.boardId,
    cardId: promptCard.id,
    prompt: options.prompt ?? promptCard.content.trim(),
    model: options.model,
    provider: options.provider,
    referenceGroupId: options.referenceGroupId,
    referenceImageIds: options.referenceImageIds,
    aspect_ratio: options.aspect_ratio,
    num_outputs: options.num_outputs,
  };
}

export async function requestGeneration(
  params: GenerationRequestParams,
): Promise<GenerationRecord> {
  const providerId = params.provider ?? ATLAS_PROVIDER;
  const provider = getProvider(providerId);

  if (params.type === "image") {
    const prediction = await provider.generateImage({
      model: params.model,
      prompt: params.prompt,
      aspect_ratio: params.aspect_ratio,
      num_outputs: params.num_outputs,
    });

    return mergePredictionIntoGenerationRecord(
      {
        boardId: params.boardId,
        cardId: params.cardId,
        prompt: params.prompt,
        model: params.model,
        provider: providerId,
        mediaType: "image",
        referenceGroupId: params.referenceGroupId,
        referenceImageIds: params.referenceImageIds,
      },
      prediction,
    );
  }

  const prediction = await provider.generateVideo({
    model: params.model,
    image_url: params.imageUrl,
    prompt: params.prompt,
    duration: params.duration,
  });

  return mergePredictionIntoGenerationRecord(
    {
      boardId: params.boardId,
      cardId: params.cardId,
      prompt: params.prompt,
      model: params.model,
      provider: providerId,
      mediaType: "video",
      referenceGroupId: params.referenceGroupId,
      referenceImageIds: params.referenceImageIds,
    },
    prediction,
  );
}

export async function pollGenerationStatus(id: string): Promise<GenerationRecord> {
  const existingRecord = loadGeneration(id);

  if (!existingRecord) {
    throw new Error(`No saved generation record found for ${id}.`);
  }

  const provider = getProvider(existingRecord.provider ?? ATLAS_PROVIDER);
  const prediction = await provider.poll(id);
  return mergePredictionIntoGenerationRecord(getStoredContext(existingRecord), prediction);
}

export async function waitForGeneration(
  id: string,
  opts?: { intervalMs?: number; maxWaitMs?: number },
): Promise<ProviderPollResult> {
  const existingRecord = loadGeneration(id);

  if (!existingRecord) {
    throw new Error(`No saved generation record found for ${id}.`);
  }

  const provider = getProvider(existingRecord.provider ?? ATLAS_PROVIDER);
  return provider.waitForCompletion(id, opts);
}
