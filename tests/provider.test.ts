import "../src/lib/providers/atlasCloudProvider";

import {
  ATLASCLOUD_IMAGE_MODEL,
  ATLASCLOUD_VIDEO_MODEL,
} from "../src/lib/atlascloud";
import {
  getModelProfile,
  getProvider,
  listModelProfiles,
  listProviders,
} from "../src/lib/provider";

test('getProvider("atlas-cloud") returns the Atlas provider', () => {
  expect(getProvider("atlas-cloud").id).toBe("atlas-cloud");
});

test('getProvider("atlas-cloud").name matches Atlas Cloud', () => {
  expect(getProvider("atlas-cloud").name).toBe("Atlas Cloud");
});

test('getProvider("unknown-provider") throws for unknown providers', () => {
  expect(() => getProvider("unknown-provider")).toThrow(/Unknown generation provider/);
});

test("Atlas capabilities disable true multi-image conditioning", () => {
  expect(getProvider("atlas-cloud").capabilities.trueMultiImageConditioning).toBe(false);
});

test("Atlas capabilities enable image and video generation", () => {
  const { capabilities } = getProvider("atlas-cloud");

  expect(capabilities.imageGeneration).toBe(true);
  expect(capabilities.videoGeneration).toBe(true);
});

test("image model profile is registered as an image model", () => {
  expect(getModelProfile(ATLASCLOUD_IMAGE_MODEL)?.generationType).toBe("image");
});

test("video model profile is registered as a video model", () => {
  expect(getModelProfile(ATLASCLOUD_VIDEO_MODEL)?.generationType).toBe("video");
});

test("image model profile exposes aspect ratio and blocks true multi-image input", () => {
  const profile = getModelProfile(ATLASCLOUD_IMAGE_MODEL);

  expect(profile?.capabilities.trueMultiImageInput).toBe(false);
  expect(profile?.capabilities.aspectRatio).toBe(true);
});

test("video model profile exposes duration control and single-image reference", () => {
  const profile = getModelProfile(ATLASCLOUD_VIDEO_MODEL);

  expect(profile?.capabilities.durationControl).toBe(true);
  expect(profile?.capabilities.singleImageReference).toBe(true);
});

test("listProviders contains exactly one registered provider", () => {
  expect(listProviders()).toHaveLength(1);
  expect(listProviders()[0]?.id).toBe("atlas-cloud");
});

test("listModelProfiles contains exactly two registered profiles", () => {
  expect(listModelProfiles()).toHaveLength(2);
});
