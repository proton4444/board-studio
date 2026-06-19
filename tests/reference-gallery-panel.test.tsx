/*
Plan:
1. Render the reference gallery with explicit fixture items so the test stays SSR-only.
2. Verify the image thumbnails and filenames appear in static markup.
3. Keep behavior checks focused on rendered output rather than DOM interactions.
*/
import { renderToStaticMarkup } from "react-dom/server";
import ReferenceGalleryPanel from "../src/components/ReferenceGalleryPanel";
import type { ReferenceImage } from "../src/schemas/media";

const fixtureItems: ReferenceImage[] = [
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

test("reference gallery renders image thumbnails for board references", () => {
  const html = renderToStaticMarkup(
    <ReferenceGalleryPanel
      boardId="board_fixture"
      items={fixtureItems}
    />,
  );

  expect(html).toContain("<img");
  expect(html).toContain('src="data:image/png;base64,ZmFrZS1yZWZlcmVuY2UtMQ=="');
  expect(html).toContain('src="data:image/png;base64,ZmFrZS1yZWZlcmVuY2UtMg=="');
  expect(html).toContain("alpha.png");
  expect(html).toContain("beta.png");
});
