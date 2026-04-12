export function createId(prefix = "item"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const HUMANISED_MODEL_NAMES: Record<string, string> = {
  "google/nano-banana/text-to-image": "Nano Banana",
  "bytedance/seedance-2.0-fast/image-to-video": "Seedance 2 Fast",
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function humaniseModelId(modelId: string): string {
  if (HUMANISED_MODEL_NAMES[modelId]) {
    return HUMANISED_MODEL_NAMES[modelId];
  }

  const fallbackSegment = modelId.split("/").filter(Boolean).pop() ?? modelId;

  return fallbackSegment
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
