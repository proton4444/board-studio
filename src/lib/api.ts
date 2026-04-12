import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
  generateImage,
  generateVideo,
  pollPrediction,
  type PredictionResult,
} from "./atlascloud";
import { loadGeneration } from "./storage";
import { createId, nowIso } from "./utils";
import type { GenerationRecord, GenerationStatus, MediaItem } from "../schemas/media";

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

export async function requestGeneration(
  params: GenerationRequestParams,
): Promise<GenerationRecord> {
  const provider = params.provider ?? ATLAS_PROVIDER;

  if (params.type === "image") {
    const prediction = await generateImage({
      model: params.model as typeof ATLASCLOUD_IMAGE_MODEL,
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
        provider,
        mediaType: "image",
        referenceGroupId: params.referenceGroupId,
        referenceImageIds: params.referenceImageIds,
      },
      prediction,
    );
  }

  const prediction = await generateVideo({
    model: params.model as typeof ATLASCLOUD_VIDEO_MODEL,
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
      provider,
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

  const prediction = await pollPrediction(id);
  return mergePredictionIntoGenerationRecord(getStoredContext(existingRecord), prediction);
}
