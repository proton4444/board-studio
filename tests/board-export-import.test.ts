import { ZodError } from "zod";
import {
  importBoards,
  listGenerationsByBoard,
  loadBoard,
  saveBoard,
  saveGeneration,
} from "../src/lib/storage";
import type { Board } from "../src/schemas/board";
import type { GenerationRecord } from "../src/schemas/media";
import { LocalStorageMock } from "./localStorageMock";

const boardFixture: Board = {
  id: "board_export_fixture",
  name: "Export Fixture",
  description: "Board export and import coverage",
  cards: [
    {
      id: "card_fixture",
      type: "prompt",
      content: "Render a surreal product shot.",
      position: { x: 72, y: 88 },
      size: { w: 360, h: 224 },
      createdAt: "2026-04-12T12:00:00.000Z",
    },
  ],
  createdAt: "2026-04-12T12:00:00.000Z",
  updatedAt: "2026-04-12T12:05:00.000Z",
};

const generationFixture: GenerationRecord = {
  id: "generation_export_fixture",
  boardId: boardFixture.id,
  cardId: "card_fixture",
  prompt: "Render a surreal product shot.",
  model: "google/nano-banana/text-to-image",
  provider: "atlas-cloud",
  status: "succeeded",
  createdAt: "2026-04-12T12:06:00.000Z",
  completedAt: "2026-04-12T12:06:08.000Z",
  output: [
    {
      id: "media_fixture",
      type: "image",
      url: "https://example.com/output.png",
      mimeType: "image/png",
      meta: {},
    },
  ],
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });
});

test("board export bundle round-trips board and generation history", () => {
  saveBoard(boardFixture);
  saveGeneration(generationFixture);

  const serialized = JSON.stringify(
    {
      board: loadBoard(boardFixture.id),
      generations: listGenerationsByBoard(boardFixture.id),
    },
    null,
    2,
  );

  expect(JSON.parse(serialized)).toEqual({
    board: boardFixture,
    generations: [generationFixture],
  });
});

test("importBoards rejects invalid board JSON with a zod error", () => {
  expect(() =>
    importBoards(
      JSON.stringify([
        {
          id: "invalid_board_fixture",
          description: "Missing required fields",
          cards: [],
          createdAt: "2026-04-12T12:00:00.000Z",
          updatedAt: "2026-04-12T12:05:00.000Z",
        },
      ]),
    ),
  ).toThrow(ZodError);
});
