import { buildImageGenParams } from "../src/lib/api";
import type { Card } from "../src/schemas/board";

const promptCardFixture: Pick<Card, "id" | "content"> = {
  id: "card_prompt_fixture",
  content: "Create an editorial portrait with bold side lighting.",
};

test("buildImageGenParams threads aspect ratio and output count", () => {
  expect(
    buildImageGenParams(promptCardFixture, {
      boardId: "board_fixture",
      model: "google/nano-banana/text-to-image",
      aspect_ratio: "16:9",
      num_outputs: 4,
      referenceGroupId: "group_fixture",
      referenceImageIds: ["reference_a", "reference_b"],
    }),
  ).toEqual({
    type: "image",
    boardId: "board_fixture",
    cardId: "card_prompt_fixture",
    prompt: "Create an editorial portrait with bold side lighting.",
    model: "google/nano-banana/text-to-image",
    provider: undefined,
    referenceGroupId: "group_fixture",
    referenceImageIds: ["reference_a", "reference_b"],
    aspect_ratio: "16:9",
    num_outputs: 4,
  });
});
