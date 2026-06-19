import { exportBoards, importBoards, loadBoard, saveBoard } from "../src/lib/storage";
import { boardSchema, type Board } from "../src/schemas/board";
import { LocalStorageMock } from "./localStorageMock";

const boardFixture: Board = {
  id: "board_fixture",
  name: "Concept Sprint",
  description: "A board fixture used to verify schema and storage round-trips.",
  cards: [
    {
      id: "card_prompt_fixture",
      type: "prompt",
      content: "Generate an editorial still life with folded paper and cast shadows.",
      position: { x: 120, y: 80 },
      size: { w: 360, h: 220 },
      createdAt: "2026-04-12T10:00:00.000Z",
    },
    {
      id: "card_note_fixture",
      type: "note",
      content: "Keep the palette sandy and the typography restrained.",
      position: { x: 520, y: 160 },
      size: { w: 280, h: 220 },
      createdAt: "2026-04-12T10:05:00.000Z",
    },
  ],
  createdAt: "2026-04-12T10:00:00.000Z",
  updatedAt: "2026-04-12T10:05:00.000Z",
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });
});

test("board schema accepts a valid fixture and storage export/import round-trips it", () => {
  expect(boardSchema.parse(boardFixture)).toEqual(boardFixture);

  saveBoard(boardFixture);
  const exported = exportBoards();

  globalThis.localStorage.clear();

  const imported = importBoards(exported);
  expect(imported).toEqual([boardFixture]);
  expect(loadBoard(boardFixture.id)).toEqual(boardFixture);
});
