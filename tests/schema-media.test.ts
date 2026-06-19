import {
  generationRecordSchema,
  imageGroupSchema,
  referenceImageSchema,
  type ImageGroup,
  type GenerationRecord,
  type ReferenceImage,
} from "../src/schemas/media";

const mediaFixture: GenerationRecord = {
  id: "generation_fixture",
  boardId: "board_fixture",
  cardId: "card_prompt_fixture",
  prompt: "Generate a soft-lit still life with layered paper textures.",
  model: "google/nano-banana/text-to-image",
  provider: "atlas-cloud",
  status: "succeeded",
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

test("generation schema accepts optional reference group metadata", () => {
  const recordWithGroup = {
    ...mediaFixture,
    referenceGroupId: "group_fixture",
    referenceImageIds: ["reference_fixture", "reference_fixture_alt"],
  };

  expect(generationRecordSchema.parse(recordWithGroup)).toEqual(recordWithGroup);
});

test("generation schema remains backward compatible without reference group metadata", () => {
  expect(generationRecordSchema.parse(mediaFixture)).toEqual(mediaFixture);
});

const referenceFixture: ReferenceImage = {
  id: "reference_fixture",
  boardId: "board_fixture",
  type: "image",
  url: "data:image/png;base64,ZmFrZS1yZWZlcmVuY2U=",
  name: "reference.png",
  createdAt: "2026-04-12T10:20:00.000Z",
  mimeType: "image/png",
  meta: {
    source: "upload",
    storage: "data-url",
  },
};

test("reference image schema accepts a valid uploaded reference fixture", () => {
  expect(referenceImageSchema.parse(referenceFixture)).toEqual(referenceFixture);
});

const imageGroupFixture: ImageGroup = {
  id: "group_fixture",
  boardId: "board_fixture",
  name: "Character lineup",
  referenceImageIds: ["reference_fixture", "reference_fixture_alt"],
  createdAt: "2026-04-12T10:25:00.000Z",
  updatedAt: "2026-04-12T10:26:00.000Z",
};

test("image group schema accepts a valid fixture", () => {
  expect(imageGroupSchema.parse(imageGroupFixture)).toEqual(imageGroupFixture);
});

test("image group schema rejects an empty name", () => {
  expect(() =>
    imageGroupSchema.parse({
      ...imageGroupFixture,
      name: "",
    }),
  ).toThrow();
});
