import { renderToStaticMarkup } from "react-dom/server";
import ImageGroupPanel from "../src/components/ImageGroupPanel";
import type { ImageGroup, ReferenceImage } from "../src/schemas/media";

const referenceImages: ReferenceImage[] = [
  {
    id: "reference_alpha",
    boardId: "board_fixture",
    type: "image",
    url: "data:image/png;base64,ZmFrZS1yZWZlcmVuY2UtMQ==",
    name: "alpha.png",
    createdAt: "2026-04-12T10:30:00.000Z",
    mimeType: "image/png",
    meta: {
      source: "upload",
      storage: "data-url",
    },
  },
  {
    id: "reference_beta",
    boardId: "board_fixture",
    type: "image",
    url: "data:image/png;base64,ZmFrZS1yZWZlcmVuY2UtMg==",
    name: "beta.png",
    createdAt: "2026-04-12T10:35:00.000Z",
    mimeType: "image/png",
    meta: {
      source: "upload",
      storage: "data-url",
    },
  },
];

const fixtureGroup: ImageGroup = {
  id: "group_fixture",
  boardId: "board_fixture",
  name: "Mood board",
  referenceImageIds: ["reference_alpha", "reference_beta"],
  createdAt: "2026-04-12T10:40:00.000Z",
  updatedAt: "2026-04-12T10:45:00.000Z",
};

test("image group panel renders the empty state when no groups exist", () => {
  const html = renderToStaticMarkup(
    <ImageGroupPanel
      boardId="board_fixture"
      items={[]}
      referenceImages={referenceImages}
    />,
  );

  expect(html).toContain("No groups yet. Select references above and create a named group.");
});

test("image group panel renders the group name from fixture items", () => {
  const html = renderToStaticMarkup(
    <ImageGroupPanel
      boardId="board_fixture"
      items={[fixtureGroup]}
      referenceImages={referenceImages}
    />,
  );

  expect(html).toContain("Mood board");
});

test("image group panel resolves member names from reference images", () => {
  const html = renderToStaticMarkup(
    <ImageGroupPanel
      boardId="board_fixture"
      items={[fixtureGroup]}
      referenceImages={referenceImages}
    />,
  );

  expect(html).toContain("alpha.png");
  expect(html).toContain("beta.png");
});
