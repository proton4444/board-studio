import { renderToStaticMarkup } from "react-dom/server";
import CollageEditorModal, {
  parseGridSize,
  selectDefaultGrid,
} from "../src/components/CollageEditorModal";
import type { ReferenceImage } from "../src/schemas/media";

const referenceImages: ReferenceImage[] = [
  {
    id: "reference_alpha",
    boardId: "board_1",
    type: "image",
    url: "data:image/png;base64,abc",
    name: "alpha.png",
    createdAt: "2026-04-12T10:30:00.000Z",
    meta: {},
  },
  {
    id: "reference_beta",
    boardId: "board_1",
    type: "image",
    url: "data:image/png;base64,abc",
    name: "beta.png",
    createdAt: "2026-04-12T10:31:00.000Z",
    meta: {},
  },
];

test("selectDefaultGrid returns the expected layout labels", () => {
  expect(selectDefaultGrid(0)).toBe("1×1 — single");
  expect(selectDefaultGrid(1)).toBe("1×1 — single");
  expect(selectDefaultGrid(2)).toBe("1×2 — side by side");
  expect(selectDefaultGrid(3)).toBe("1×3 — row of three");
  expect(selectDefaultGrid(4)).toBe("2×2 — four up");
  expect(selectDefaultGrid(6)).toBe("2×3 — six up");
  expect(selectDefaultGrid(7)).toBe("3×2 — six up wide");
});

test("parseGridSize extracts grid dimensions from the option label", () => {
  expect(parseGridSize("1×1 — single")).toEqual({ cols: 1, rows: 1 });
  expect(parseGridSize("2×3 — six up")).toEqual({ cols: 2, rows: 3 });
  expect(parseGridSize("3×2 — six up wide")).toEqual({ cols: 3, rows: 2 });
  expect(parseGridSize("not-a-grid")).toEqual({ cols: 1, rows: 1 });
});

test("collage editor modal renders the heading when open", () => {
  const html = renderToStaticMarkup(
    <CollageEditorModal
      boardId="board_1"
      onClose={() => {}}
      onSave={() => {}}
      open={true}
      referenceImages={referenceImages}
    />,
  );

  expect(html).toContain("Create a collage");
});

test("collage editor modal renders the empty state when no references exist", () => {
  const html = renderToStaticMarkup(
    <CollageEditorModal
      boardId="board_1"
      onClose={() => {}}
      onSave={() => {}}
      open={true}
      referenceImages={[]}
    />,
  );

  expect(html).toContain("Upload reference images first.");
});

test("collage editor modal renders nothing when closed", () => {
  const html = renderToStaticMarkup(
    <CollageEditorModal
      boardId="board_1"
      onClose={() => {}}
      onSave={() => {}}
      open={false}
      referenceImages={referenceImages}
    />,
  );

  expect(html).toBe("");
});
