import { ZodType } from "zod";
import { boardCollectionSchema, boardSchema, type Board } from "../schemas/board";
import {
  generationCollectionSchema,
  generationRecordSchema,
  type GenerationRecord,
} from "../schemas/media";

const BOARD_PREFIX = "board:";
const GENERATION_PREFIX = "generation:";

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

export function exportGenerationsByBoard(boardId: string): string {
  return JSON.stringify(listGenerationsByBoard(boardId), null, 2);
}

export function importGenerations(json: string): GenerationRecord[] {
  const parsed = generationCollectionSchema.parse(JSON.parse(json));
  parsed.forEach((record) => saveGeneration(record));
  return parsed;
}
