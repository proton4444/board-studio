import {
  appendReferenceNamesToPrompt,
  getMultiRefVideoCapabilityState,
  getOrderedGroupReferenceNames,
  isMultiRefVideoCapable,
  type MultiRefVideoCapabilityState,
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

function expectCapabilityState(
  actual: MultiRefVideoCapabilityState,
  expected: Partial<MultiRefVideoCapabilityState>,
) {
  expect(actual).toMatchObject(expected);
}

test("getMultiRefVideoCapabilityState returns multi-ref for all-remote groups when upload is available", () => {
  const state = getMultiRefVideoCapabilityState(imageGroupFixture, referenceImagesById, true);

  expectCapabilityState(state, { path: "multi-ref" });
  expect(state.reason).toBeUndefined();
});

test("getMultiRefVideoCapabilityState returns multi-ref for all-remote groups without upload capability", () => {
  const state = getMultiRefVideoCapabilityState(imageGroupFixture, referenceImagesById, false);

  expectCapabilityState(state, { path: "multi-ref" });
});

test("getMultiRefVideoCapabilityState returns upload-then-multi-ref when local data URLs can be uploaded", () => {
  const state = getMultiRefVideoCapabilityState(
    imageGroupFixture,
    {
      ...referenceImagesById,
      reference_a: {
        ...referenceImagesById.reference_a,
        url: "data:image/png;base64,abc123",
      },
    },
    true,
  );

  expectCapabilityState(state, {
    path: "upload-then-multi-ref",
    dataUrlImageIds: ["reference_a"],
  });
  expect(state.reason).toContain("1 image(s)");
});

test("getMultiRefVideoCapabilityState returns bridge when local data URLs exist and the first image is remote", () => {
  const state = getMultiRefVideoCapabilityState(
    imageGroupFixture,
    {
      ...referenceImagesById,
      reference_a: {
        ...referenceImagesById.reference_a,
        url: "data:image/png;base64,abc123",
      },
    },
    false,
  );

  expectCapabilityState(state, {
    path: "bridge",
    dataUrlImageIds: ["reference_a"],
  });
  expect(state.reason).toBeDefined();
});

test("getMultiRefVideoCapabilityState returns unavailable when all references are local data URLs and upload is unavailable", () => {
  const state = getMultiRefVideoCapabilityState(
    imageGroupFixture,
    {
      ...referenceImagesById,
      reference_a: {
        ...referenceImagesById.reference_a,
        url: "data:image/png;base64,abc123",
      },
      reference_b: {
        ...referenceImagesById.reference_b,
        url: "data:image/png;base64,xyz789",
      },
    },
    false,
  );

  expectCapabilityState(state, {
    path: "unavailable",
    dataUrlImageIds: ["reference_b", "reference_a"],
  });
  expect(state.reason).toBeDefined();
});

test("getMultiRefVideoCapabilityState returns unavailable for an empty group", () => {
  const state = getMultiRefVideoCapabilityState(
    {
      ...imageGroupFixture,
      referenceImageIds: [],
    },
    referenceImagesById,
    false,
  );

  expectCapabilityState(state, { path: "unavailable" });
  expect(state.reason).toBeDefined();
});

test("getMultiRefVideoCapabilityState returns unavailable when the first image is a local data URL and upload is unavailable", () => {
  const state = getMultiRefVideoCapabilityState(
    imageGroupFixture,
    {
      ...referenceImagesById,
      reference_b: {
        ...referenceImagesById.reference_b,
        url: "data:image/png;base64,abc123",
      },
    },
    false,
  );

  expectCapabilityState(state, {
    path: "unavailable",
    dataUrlImageIds: ["reference_b"],
  });
  expect(state.reason).toBeDefined();
});
