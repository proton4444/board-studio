import { deleteScript, loadScript, saveScript } from "../src/lib/storage";
import type { Script } from "../src/schemas/script";
import { LocalStorageMock } from "./localStorageMock";

const olderScript: Script = {
  id: "script_older",
  boardId: "board_fixture",
  name: "Older script",
  shots: [],
  createdAt: "2026-04-12T11:00:00.000Z",
  updatedAt: "2026-04-12T11:05:00.000Z",
};

const newerScript: Script = {
  id: "script_newer",
  boardId: "board_fixture",
  name: "Newer script",
  shots: [],
  createdAt: "2026-04-12T11:10:00.000Z",
  updatedAt: "2026-04-12T11:15:00.000Z",
};

const otherBoardScript: Script = {
  id: "script_other_board",
  boardId: "board_other",
  name: "Other board script",
  shots: [],
  createdAt: "2026-04-12T11:20:00.000Z",
  updatedAt: "2026-04-12T11:25:00.000Z",
};

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new LocalStorageMock(),
    configurable: true,
    writable: true,
  });
});

test("saveScript + loadScript(boardId) returns the saved script", () => {
  saveScript(olderScript);

  expect(loadScript(olderScript.boardId)).toEqual(olderScript);
});

test("loadScript for unknown boardId returns null", () => {
  saveScript(olderScript);

  expect(loadScript("missing_board")).toBeNull();
});

test("deleteScript removes it and loadScript returns null after deletion", () => {
  saveScript(olderScript);

  deleteScript(olderScript.id);

  expect(loadScript(olderScript.boardId)).toBeNull();
});

test("loadScript returns null when no script exists for that boardId and another boardId does", () => {
  saveScript(otherBoardScript);

  expect(loadScript(olderScript.boardId)).toBeNull();
});

test("loadScript returns the most recently updated script for a board", () => {
  saveScript(olderScript);
  saveScript(newerScript);

  expect(loadScript(olderScript.boardId)).toEqual(newerScript);
});
