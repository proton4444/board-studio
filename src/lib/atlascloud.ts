export const DEFAULT_ATLASCLOUD_BASE_URL = "https://api.atlascloud.ai/api/v1";
export const ATLASCLOUD_IMAGE_MODEL = "google/nano-banana/text-to-image";
export const ATLASCLOUD_VIDEO_MODEL = "bytedance/seedance-2.0-fast/image-to-video";

type AtlasCloudStatus = "pending" | "processing" | "succeeded" | "failed";

export interface ImageGenRequest {
  model: typeof ATLASCLOUD_IMAGE_MODEL;
  prompt: string;
  aspect_ratio?: string;
  num_outputs?: number;
  seed?: number;
  output_format?: string;
  guidance_scale?: number;
}

export interface VideoGenRequest {
  model: typeof ATLASCLOUD_VIDEO_MODEL;
  image_url: string;
  prompt?: string;
  duration?: number;
}

export interface UploadMediaRequest {
  url: string;
}

export interface PredictionResult {
  id: string;
  status: AtlasCloudStatus;
  output?: string[];
  error?: string;
}

export class AtlasCloudError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message);
    this.name = "AtlasCloudError";
    this.status = options?.status;
    this.body = options?.body;
  }
}

type AtlasCloudEnv = ImportMetaEnv & {
  VITE_ATLAS_PROXY_BASE?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapEnvelope(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    throw new AtlasCloudError("Atlas Cloud returned a non-object response.", {
      body: raw,
    });
  }

  if (isRecord(raw.data)) {
    return raw.data;
  }

  return raw;
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeStatus(status: unknown): AtlasCloudStatus {
  if (typeof status !== "string") {
    throw new AtlasCloudError("Atlas Cloud response did not include a valid status.");
  }

  switch (status.toLowerCase()) {
    case "pending":
    case "queued":
    case "starting":
      return "pending";
    case "processing":
    case "running":
    case "in_progress":
      return "processing";
    case "succeeded":
    case "completed":
    case "done":
      return "succeeded";
    case "failed":
    case "error":
    case "canceled":
    case "cancelled":
      return "failed";
    default:
      throw new AtlasCloudError(`Unsupported Atlas Cloud status: ${status}`);
  }
}

function normalizeOutput(output: unknown): string[] | undefined {
  if (typeof output === "string" && output.length > 0) {
    return [output];
  }

  if (!Array.isArray(output)) {
    return undefined;
  }

  const urls = output.flatMap((item) => {
    if (typeof item === "string" && item.length > 0) {
      return [item];
    }

    if (isRecord(item)) {
      const candidate = readString(item, "url") ?? readString(item, "image_url") ?? readString(item, "video_url");

      if (candidate) {
        return [candidate];
      }
    }

    return [];
  });

  return urls.length > 0 ? urls : undefined;
}

function extractError(source: Record<string, unknown>): string | undefined {
  return readString(source, "error") ?? readString(source, "message");
}

function parseJsonBody(bodyText: string): unknown {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
}

function debugResponse(path: string, body: unknown): void {
  if (import.meta.env.DEV) {
    console.debug(`[AtlasCloud] ${path}`, body);
  }
}

export function validateAtlasCloudEnv(env: AtlasCloudEnv = import.meta.env as AtlasCloudEnv): {
  proxyBase: string;
} {
  return {
    proxyBase: env.VITE_ATLAS_PROXY_BASE?.trim() ?? "",
  };
}

async function atlasFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { proxyBase } = validateAtlasCloudEnv();
  const response = await fetch(`${proxyBase}/api/atlas${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const bodyText = await response.text();
  const parsedBody = parseJsonBody(bodyText);

  debugResponse(path, parsedBody);

  if (!response.ok) {
    const errorBody = isRecord(parsedBody) ? unwrapEnvelope(parsedBody) : parsedBody;
    const message =
      (isRecord(errorBody) && extractError(errorBody)) ||
      `Atlas Cloud request failed with status ${response.status}`;

    throw new AtlasCloudError(message, {
      status: response.status,
      body: parsedBody,
    });
  }

  return parsedBody;
}

export function normalizeResponse(raw: unknown): PredictionResult {
  const payload = unwrapEnvelope(raw);
  const id = readString(payload, "id");

  if (!id) {
    throw new AtlasCloudError("Atlas Cloud response did not include a prediction id.", {
      body: raw,
    });
  }

  return {
    id,
    status: normalizeStatus(payload.status),
    output: normalizeOutput(payload.output),
    error: extractError(payload),
  };
}

function extractUploadUrl(raw: unknown): string {
  const payload = unwrapEnvelope(raw);
  const directUrl =
    readString(payload, "url") ??
    readString(payload, "image_url") ??
    readString(payload, "media_url");

  if (directUrl) {
    return directUrl;
  }

  const outputs = normalizeOutput(payload.output);

  if (outputs?.[0]) {
    return outputs[0];
  }

  throw new AtlasCloudError("Atlas Cloud uploadMedia did not return a usable URL.", {
    body: raw,
  });
}

export async function generateImage(req: ImageGenRequest): Promise<PredictionResult> {
  return normalizeResponse(
    await atlasFetch("/model/generateImage", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  );
}

export async function generateVideo(req: VideoGenRequest): Promise<PredictionResult> {
  return normalizeResponse(
    await atlasFetch("/model/generateVideo", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  );
}

export async function uploadMedia(imageUrl: string): Promise<string> {
  const request: UploadMediaRequest = {
    url: imageUrl,
  };

  return extractUploadUrl(
    await atlasFetch("/model/uploadMedia", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  );
}

export async function pollPrediction(id: string): Promise<PredictionResult> {
  return normalizeResponse(await atlasFetch(`/model/prediction/${id}`));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function waitForCompletion(
  id: string,
  opts?: { intervalMs?: number; maxWaitMs?: number },
): Promise<PredictionResult> {
  const intervalMs = opts?.intervalMs ?? 2000;
  const maxWaitMs = opts?.maxWaitMs ?? 180000;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= maxWaitMs) {
    const result = await pollPrediction(id);

    if (result.status === "succeeded") {
      return result;
    }

    if (result.status === "failed") {
      throw new AtlasCloudError(result.error ?? `Prediction ${id} failed.`, {
        body: result,
      });
    }

    await sleep(intervalMs);
  }

  throw new AtlasCloudError(`Timed out waiting for Atlas Cloud prediction ${id}.`);
}
