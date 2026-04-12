import { generationRecordSchema, type GenerationRecord } from "../src/schemas/media";

const mediaFixture: GenerationRecord = {
  id: "generation_fixture",
  boardId: "board_fixture",
  cardId: "card_prompt_fixture",
  prompt: "Generate a soft-lit still life with layered paper textures.",
  model: "studio-vision-1",
  provider: "local-proxy",
  status: "done",
  createdAt: "2026-04-12T10:10:00.000Z",
  completedAt: "2026-04-12T10:10:08.000Z",
  output: [
    {
      id: "media_fixture_image",
      type: "image",
      url: "https://example.com/final-image.png",
      mimeType: "image/png",
      meta: {
        width: 1536,
        height: 1024,
      },
    },
    {
      id: "media_fixture_text",
      type: "text",
      content: "Generation completed successfully.",
      mimeType: "text/plain",
      meta: {
        tokens: 84,
      },
    },
  ],
};

test("generation schema accepts a valid fixture with media items", () => {
  expect(generationRecordSchema.parse(mediaFixture)).toEqual(mediaFixture);
});
