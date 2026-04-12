import {
  appendReferenceNamesToPrompt,
  getOrderedGroupReferenceNames,
  isMultiRefVideoCapable,
  selectVideoReferenceImageUrl,
} from "../src/lib/multiref";
import type { ImageGroup, ReferenceImage } from "../src/schemas/media";

const imageGroupFixture: ImageGroup = {
  id: "group_fixture",
  boardId: "board_fixture",
  name: "Character lineup",
  referenceImageIds: ["reference_b", "reference_a"],
  createdAt: "2026-04-12T11:00:00.000Z",
  updatedAt: "2026-04-12T11:05:00.000Z",
};

const referenceImagesById: Record<string, ReferenceImage> = {
  reference_a: {
    id: "reference_a",
    boardId: "board_fixture",
    type: "image",
    url: "https://example.com/reference-a.png",
    name: "Hero profile",
    createdAt: "2026-04-12T10:00:00.000Z",
    mimeType: "image/png",
    meta: {},
  },
  reference_b: {
    id: "reference_b",
    boardId: "board_fixture",
    type: "image",
    url: "https://example.com/reference-b.png",
    name: "Wardrobe detail",
    createdAt: "2026-04-12T10:05:00.000Z",
    mimeType: "image/png",
    meta: {},
  },
};

test("appendReferenceNamesToPrompt adds a best-effort reference note", () => {
  expect(
    appendReferenceNamesToPrompt("Studio portrait with cinematic rim light.", [
      "Hero profile",
      "Wardrobe detail",
    ]),
  ).toBe(
    "Studio portrait with cinematic rim light.\n\n[References: Hero profile, Wardrobe detail]",
  );
});

test("group-assisted image generation uses ordered prompt augmentation as the production bridge path", () => {
  const orderedReferenceNames = getOrderedGroupReferenceNames(imageGroupFixture, referenceImagesById);

  expect(
    appendReferenceNamesToPrompt(
      "Studio portrait with cinematic rim light.",
      orderedReferenceNames,
    ),
  ).toBe(
    "Studio portrait with cinematic rim light.\n\n[References: Wardrobe detail, Hero profile]",
  );
});

test("selectVideoReferenceImageUrl returns the first ordered group member URL", () => {
  expect(selectVideoReferenceImageUrl(imageGroupFixture, referenceImagesById)).toBe(
    "https://example.com/reference-b.png",
  );
});

test("isMultiRefVideoCapable returns true when every ordered reference is remote", () => {
  expect(isMultiRefVideoCapable(imageGroupFixture, referenceImagesById)).toBe(true);
});

test("isMultiRefVideoCapable returns false when any ordered reference is a data URL", () => {
  expect(
    isMultiRefVideoCapable(
      imageGroupFixture,
      {
        ...referenceImagesById,
        reference_a: {
          ...referenceImagesById.reference_a,
          url: "data:image/png;base64,abc123",
        },
      },
    ),
  ).toBe(false);
});

test("isMultiRefVideoCapable returns false for an empty group", () => {
  expect(
    isMultiRefVideoCapable(
      {
        ...imageGroupFixture,
        referenceImageIds: [],
      },
      referenceImagesById,
    ),
  ).toBe(false);
});
