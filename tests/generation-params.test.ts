import {
  buildImageGenParams,
  mergePredictionIntoGenerationRecord,
} from "../src/lib/api";
import type { Card } from "../src/schemas/board";
import { generationRecordSchema } from "../src/schemas/media";

const promptCardFixture: Pick<Card, "id" | "content"> = {
  id: "card_prompt_fixture",
  content: "Create an editorial portrait with bold side lighting.",
};

const validRecord = {
  id: "gen_fixture",
  boardId: "board_fixture",
  cardId: "card_prompt_fixture",
  prompt: "Create an editorial portrait with bold side lighting.",
  model: "google/nano-banana/text-to-image",
  provider: "atlas-cloud",
  status: "succeeded" as const,
  createdAt: "2026-04-12T00:00:00.000Z",
  output: [
    {
      id: "output_fixture",
      type: "image" as const,
      url: "https://example.com/out.png",
      mimeType: "image/png",
      meta: {},
    },
  ],
};

const predictionFixture = {
  id: "pred_1",
  status: "succeeded" as const,
  output: ["https://example.com/out.png"],
};

const generationContextFixture = {
  boardId: "b1",
  cardId: "c1",
  prompt: "test",
  model: "google/nano-banana/text-to-image",
  provider: "atlas-cloud",
  mediaType: "image" as const,
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
    seed: undefined,
    guidance_scale: undefined,
    output_format: undefined,
  });
});

test("buildImageGenParams includes seed when provided", () => {
  expect(
    buildImageGenParams(promptCardFixture, {
      boardId: "board_fixture",
      model: "google/nano-banana/text-to-image",
      seed: 42,
    }).seed,
  ).toBe(42);
});

test("buildImageGenParams includes guidance scale when provided", () => {
  expect(
    buildImageGenParams(promptCardFixture, {
      boardId: "board_fixture",
      model: "google/nano-banana/text-to-image",
      guidance_scale: 10,
    }).guidance_scale,
  ).toBe(10);
});

test("buildImageGenParams includes output format when provided", () => {
  expect(
    buildImageGenParams(promptCardFixture, {
      boardId: "board_fixture",
      model: "google/nano-banana/text-to-image",
      output_format: "webp",
    }).output_format,
  ).toBe("webp");
});

test("buildImageGenParams leaves advanced params undefined when omitted", () => {
  expect(
    buildImageGenParams(promptCardFixture, {
      boardId: "board_fixture",
      model: "google/nano-banana/text-to-image",
    }),
  ).toMatchObject({
    seed: undefined,
    guidance_scale: undefined,
    output_format: undefined,
  });
});

test("generationRecordSchema accepts seed when valid", () => {
  const parsed = generationRecordSchema.parse({
    ...validRecord,
    seed: 42,
  });

  expect(parsed.seed).toBe(42);
});

test("generationRecordSchema stays backward compatible when seed is omitted", () => {
  const parsed = generationRecordSchema.parse(validRecord);

  expect(parsed.seed).toBeUndefined();
});

test("generationRecordSchema rejects negative seed", () => {
  expect(() =>
    generationRecordSchema.parse({
      ...validRecord,
      seed: -1,
    }),
  ).toThrow();
});

test("mergePredictionIntoGenerationRecord stores seed from context", () => {
  const record = mergePredictionIntoGenerationRecord(
    {
      ...generationContextFixture,
      seed: 99,
    },
    predictionFixture,
  );

  expect(record.seed).toBe(99);
});

test("mergePredictionIntoGenerationRecord stores output format and maps image mime type", () => {
  const record = mergePredictionIntoGenerationRecord(
    {
      ...generationContextFixture,
      outputFormat: "webp",
    },
    predictionFixture,
  );

  expect(record.outputFormat).toBe("webp");
  expect(record.output?.[0]?.mimeType).toBe("image/webp");
});

test("mergePredictionIntoGenerationRecord leaves seed undefined when not provided", () => {
  const record = mergePredictionIntoGenerationRecord(
    generationContextFixture,
    predictionFixture,
  );

  expect(record.seed).toBeUndefined();
});
