import { generationRecordSchema, type GenerationRecord } from "../schemas/media";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const API_KEY = import.meta.env.VITE_API_KEY;

// TODO: replace with real endpoint once API is confirmed

type GenerationRequestParams = {
  prompt: string;
  model: string;
  provider: string;
  boardId: string;
  cardId: string;
};

function createHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  return headers;
}

async function parseResponse(response: Response): Promise<GenerationRecord> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Generation API returned ${response.status}`;

    throw new Error(message);
  }

  return generationRecordSchema.parse(payload);
}

export async function requestGeneration(
  params: GenerationRequestParams,
): Promise<GenerationRecord> {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify(params),
  });

  return parseResponse(response);
}

export async function pollGenerationStatus(id: string): Promise<GenerationRecord> {
  const response = await fetch(`${API_BASE_URL}/generate/${id}`, {
    headers: createHeaders(),
  });

  return parseResponse(response);
}
