import { renderToStaticMarkup } from "react-dom/server";
import MediaOutputPanel from "../src/components/MediaOutputPanel";
import type { GenerationRecord, MediaItem } from "../src/schemas/media";

const baseRecord: GenerationRecord = {
  id: "generation_fixture",
  boardId: "board_fixture",
  cardId: "card_fixture",
  prompt: "Create a cinematic output.",
  model: "google/nano-banana/text-to-image",
  provider: "atlas-cloud",
  status: "succeeded",
  createdAt: "2026-04-12T10:10:00.000Z",
  completedAt: "2026-04-12T10:10:08.000Z",
  output: [],
};

function renderPanel(output: MediaItem[]) {
  return renderToStaticMarkup(
    <MediaOutputPanel
      isCreatingVideo={false}
      onMakeVideo={() => undefined}
      panelErrorMessage={null}
      record={{
        ...baseRecord,
        output,
      }}
    />,
  );
}

test("image-type media items render an img element", () => {
  const html = renderPanel([
    {
      id: "image_fixture",
      type: "image",
      url: "https://example.com/output.png",
      mimeType: "image/png",
      meta: {},
    },
  ]);

  expect(html).toContain("<img");
  expect(html).toContain('src="https://example.com/output.png"');
  expect(html).toContain("Download");
});

test("video-type media items render a video element", () => {
  const html = renderPanel([
    {
      id: "video_fixture",
      type: "video",
      url: "https://example.com/output.mp4",
      mimeType: "video/mp4",
      meta: {},
    },
  ]);

  expect(html).toContain("<video");
  expect(html).toContain('src="https://example.com/output.mp4"');
  expect(html).toContain("controls");
  expect(html).toContain("Download");
});
