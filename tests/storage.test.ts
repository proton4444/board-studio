import {
  deleteReferenceImage,
  exportBoards,
  importBoards,
  listBoards,
  loadReferenceImages,
  loadBoard,
  saveBoard,
  saveReferenceImage,
  deleteBoard,
} from "../src/lib/storage";
import type { Board } from "../src/schemas/board";
import type { ReferenceImage } from "../src/schemas/media";
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

const referenceImageFixture: ReferenceImage = {
  id: "reference_fixture",
  boardId: firstBoard.id,
  type: "image",
  url: "data:image/png;base64,ZmFrZS1yZWZlcmVuY2U=",
  name: "reference.png",
  createdAt: "2026-04-12T10:00:00.000Z",
  mimeType: "image/png",
  meta: {
    source: "upload",
    storage: "data-url",
  },
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

test("save, load, and delete reference images per board", () => {
  saveReferenceImage(referenceImageFixture);
  saveReferenceImage({
    ...referenceImageFixture,
    id: "reference_fixture_second",
    createdAt: "2026-04-12T10:05:00.000Z",
    name: "reference-2.png",
  });
  saveReferenceImage({
    ...referenceImageFixture,
    id: "reference_other_board",
    boardId: secondBoard.id,
    name: "other-board.png",
  });

  expect(loadReferenceImages(firstBoard.id)).toEqual([
    {
      ...referenceImageFixture,
      id: "reference_fixture_second",
      createdAt: "2026-04-12T10:05:00.000Z",
      name: "reference-2.png",
    },
    referenceImageFixture,
  ]);

  deleteReferenceImage(referenceImageFixture.id);

  expect(loadReferenceImages(firstBoard.id)).toEqual([
    {
      ...referenceImageFixture,
      id: "reference_fixture_second",
      createdAt: "2026-04-12T10:05:00.000Z",
      name: "reference-2.png",
    },
  ]);
});

test("deleting a board also removes its reference images", () => {
  saveBoard(firstBoard);
  saveReferenceImage(referenceImageFixture);

  deleteBoard(firstBoard.id);

  expect(loadReferenceImages(firstBoard.id)).toEqual([]);
});
