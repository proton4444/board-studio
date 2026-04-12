import {
  exportBoards,
  importBoards,
  listBoards,
  loadBoard,
  saveBoard,
  deleteBoard,
} from "../src/lib/storage";
import type { Board } from "../src/schemas/board";
import { LocalStorageMock } from "./localStorageMock";

const firstBoard: Board = {
  id: "board_alpha",
  name: "Alpha",
  description: "Primary board fixture",
  cards: [],
  createdAt: "2026-04-12T09:00:00.000Z",
  updatedAt: "2026-04-12T09:15:00.000Z",
};

const secondBoard: Board = {
  id: "board_beta",
  name: "Beta",
  description: "Secondary board fixture",
  cards: [],
  createdAt: "2026-04-12T09:30:00.000Z",
  updatedAt: "2026-04-12T09:45:00.000Z",
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });
});

test("save, load, list, export, import, and delete boards round-trip cleanly", () => {
  saveBoard(firstBoard);
  saveBoard(secondBoard);

  expect(loadBoard(firstBoard.id)).toEqual(firstBoard);
  expect(listBoards()).toEqual([secondBoard, firstBoard]);

  const exported = exportBoards();

  globalThis.localStorage.clear();

  expect(importBoards(exported)).toEqual([secondBoard, firstBoard]);
  expect(listBoards()).toEqual([secondBoard, firstBoard]);

  deleteBoard(firstBoard.id);

  expect(loadBoard(firstBoard.id)).toBeNull();
  expect(listBoards()).toEqual([secondBoard]);
});
