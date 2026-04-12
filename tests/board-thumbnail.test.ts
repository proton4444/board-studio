import { getLatestBoardThumbnailUrl, saveGeneration } from "../src/lib/storage";
import type { GenerationRecord } from "../src/schemas/media";
import { LocalStorageMock } from "./localStorageMock";

const boardId = "board_thumbnail_fixture";

function createGeneration(
  overrides: Partial<GenerationRecord> = {},
): GenerationRecord {
  return {
    id: "generation_thumbnail_fixture",
    boardId,
    cardId: "card_thumbnail_fixture",
    prompt: "Create a thumbnail-worthy image.",
    model: "google/nano-banana/text-to-image",
    provider: "atlas-cloud",
    status: "pending",
    createdAt: "2026-04-12T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });
});

test("returns null when no generation records exist for the board", () => {
  expect(getLatestBoardThumbnailUrl(boardId)).toBeNull();
});

test('returns null when records exist but none have status "succeeded"', () => {
  saveGeneration(
    createGeneration({
      id: "generation_pending_fixture",
      status: "pending",
    }),
  );
  saveGeneration(
    createGeneration({
      id: "generation_failed_fixture",
      status: "failed",
      createdAt: "2026-04-12T12:01:00.000Z",
      error: "Atlas request failed.",
    }),
  );

  expect(getLatestBoardThumbnailUrl(boardId)).toBeNull();
});

test('returns null when a succeeded record exists but its first output is type "video"', () => {
  saveGeneration(
    createGeneration({
      id: "generation_video_fixture",
      status: "succeeded",
      output: [
        {
          id: "media_video_fixture",
          type: "video",
          url: "https://example.com/output.mp4",
          mimeType: "video/mp4",
          meta: {},
        },
      ],
    }),
  );

  expect(getLatestBoardThumbnailUrl(boardId)).toBeNull();
});

test("returns the URL of the first output from the most recent succeeded image record", () => {
  saveGeneration(
    createGeneration({
      id: "generation_succeeded_image_fixture",
      status: "succeeded",
      output: [
        {
          id: "media_image_fixture",
          type: "image",
          url: "https://example.com/output-latest.png",
          mimeType: "image/png",
          meta: {},
        },
        {
          id: "media_second_fixture",
          type: "image",
          url: "https://example.com/output-second.png",
          mimeType: "image/png",
          meta: {},
        },
      ],
    }),
  );

  expect(getLatestBoardThumbnailUrl(boardId)).toBe("https://example.com/output-latest.png");
});

test("returns the URL from the newest succeeded image record when multiple matches exist", () => {
  saveGeneration(
    createGeneration({
      id: "generation_older_image_fixture",
      status: "succeeded",
      createdAt: "2026-04-12T12:00:00.000Z",
      output: [
        {
          id: "media_older_image_fixture",
          type: "image",
          url: "https://example.com/output-older.png",
          mimeType: "image/png",
          meta: {},
        },
      ],
    }),
  );
  saveGeneration(
    createGeneration({
      id: "generation_newer_image_fixture",
      status: "succeeded",
      createdAt: "2026-04-12T12:02:00.000Z",
      output: [
        {
          id: "media_newer_image_fixture",
          type: "image",
          url: "https://example.com/output-newer.png",
          mimeType: "image/png",
          meta: {},
        },
      ],
    }),
  );

  expect(getLatestBoardThumbnailUrl(boardId)).toBe("https://example.com/output-newer.png");
});
