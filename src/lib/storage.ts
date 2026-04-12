import { ZodType } from "zod";
import { boardCollectionSchema, boardSchema, type Board } from "../schemas/board";
import {
  generationCollectionSchema,
  generationRecordSchema,
  imageGroupSchema,
  referenceImageSchema,
  type ImageGroup,
  type ReferenceImage,
  type GenerationRecord,
} from "../schemas/media";

const BOARD_PREFIX = "board:";
const GENERATION_PREFIX = "generation:";
const REFERENCE_IMAGE_PREFIX = "reference-image:";
const IMAGE_GROUP_PREFIX = "image-group:";

function getStorage(): Storage {
  if (!("localStorage" in globalThis)) {
    throw new Error("localStorage is not available in this environment.");
  }

  return globalThis.localStorage;
}

function readValidatedRecord<T>(key: string, schema: ZodType<T>): T | null {
  const raw = getStorage().getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function collectByPrefix<T>(prefix: string, schema: ZodType<T>): T[] {
  const storage = getStorage();
  const items: T[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key || !key.startsWith(prefix)) {
      continue;
    }

    const value = readValidatedRecord(key, schema);

    if (value) {
      items.push(value);
    }
  }

  return items;
}

export function saveBoard(board: Board): void {
  const safeBoard = boardSchema.parse(board);
  getStorage().setItem(`${BOARD_PREFIX}${safeBoard.id}`, JSON.stringify(safeBoard));
}

export function loadBoard(id: string): Board | null {
  return readValidatedRecord(`${BOARD_PREFIX}${id}`, boardSchema);
}

export function listBoards(): Board[] {
  return collectByPrefix(BOARD_PREFIX, boardSchema).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function deleteBoard(id: string): void {
  const storage = getStorage();
  storage.removeItem(`${BOARD_PREFIX}${id}`);

  const generations = listGenerationsByBoard(id);
  generations.forEach((record) => storage.removeItem(`${GENERATION_PREFIX}${record.id}`));
  const referenceImages = loadReferenceImages(id);
  referenceImages.forEach((image) => storage.removeItem(`${REFERENCE_IMAGE_PREFIX}${image.id}`));
  const imageGroups = loadImageGroups(id);
  imageGroups.forEach((group) => storage.removeItem(`${IMAGE_GROUP_PREFIX}${group.id}`));
}

export function exportBoards(): string {
  return JSON.stringify(listBoards(), null, 2);
}

export function importBoards(json: string): Board[] {
  const parsed = boardCollectionSchema.parse(JSON.parse(json));
  parsed.forEach((board) => saveBoard(board));
  return parsed;
}

export function saveGeneration(record: GenerationRecord): void {
  const safeRecord = generationRecordSchema.parse(record);
  getStorage().setItem(`${GENERATION_PREFIX}${safeRecord.id}`, JSON.stringify(safeRecord));
}

export function loadGeneration(id: string): GenerationRecord | null {
  return readValidatedRecord(`${GENERATION_PREFIX}${id}`, generationRecordSchema);
}

export function listGenerationsByBoard(boardId: string): GenerationRecord[] {
  return collectByPrefix(GENERATION_PREFIX, generationRecordSchema)
    .filter((record) => record.boardId === boardId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getLatestBoardThumbnailUrl(boardId: string): string | null {
  const records = listGenerationsByBoard(boardId);

  for (const record of records) {
    if (record.status !== "succeeded") continue;
    const firstOutput = record.output?.[0];

    if (firstOutput?.type === "image" && firstOutput.url) {
      return firstOutput.url;
    }
  }

  return null;
}

export function exportGenerationsByBoard(boardId: string): string {
  return JSON.stringify(listGenerationsByBoard(boardId), null, 2);
}

export function importGenerations(json: string): GenerationRecord[] {
  const parsed = generationCollectionSchema.parse(JSON.parse(json));
  parsed.forEach((record) => saveGeneration(record));
  return parsed;
}

export function saveReferenceImage(image: ReferenceImage): void {
  const safeImage = referenceImageSchema.parse(image);
  getStorage().setItem(`${REFERENCE_IMAGE_PREFIX}${safeImage.id}`, JSON.stringify(safeImage));
}

export function loadReferenceImages(boardId: string): ReferenceImage[] {
  return collectByPrefix(REFERENCE_IMAGE_PREFIX, referenceImageSchema)
    .filter((image) => image.boardId === boardId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function deleteReferenceImage(id: string): void {
  getStorage().removeItem(`${REFERENCE_IMAGE_PREFIX}${id}`);
}

export function saveImageGroup(group: ImageGroup): void {
  const safeGroup = imageGroupSchema.parse(group);
  getStorage().setItem(`${IMAGE_GROUP_PREFIX}${safeGroup.id}`, JSON.stringify(safeGroup));
}

export function loadImageGroups(boardId: string): ImageGroup[] {
  return collectByPrefix(IMAGE_GROUP_PREFIX, imageGroupSchema)
    .filter((group) => group.boardId === boardId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function updateImageGroup(
  id: string,
  patch: Partial<Pick<ImageGroup, "name" | "referenceImageIds" | "updatedAt">>,
): void {
  const existingGroup = readValidatedRecord(`${IMAGE_GROUP_PREFIX}${id}`, imageGroupSchema);

  if (!existingGroup) {
    return;
  }

  saveImageGroup({
    ...existingGroup,
    ...patch,
  });
}

export function deleteImageGroup(id: string): void {
  getStorage().removeItem(`${IMAGE_GROUP_PREFIX}${id}`);
}
