import type { ImageGroup, ReferenceImage } from "../schemas/media";

export type ReferenceImageLookup = Record<
  string,
  Pick<ReferenceImage, "id" | "name" | "url"> | undefined
>;

export type MultiRefVideoPath =
  | "multi-ref"
  | "upload-then-multi-ref"
  | "bridge"
  | "unavailable";

export type MultiRefVideoCapabilityState = {
  path: MultiRefVideoPath;
  reason?: string;
  dataUrlImageIds?: string[];
};

export function appendReferenceNamesToPrompt(prompt: string, referenceNames: string[]): string {
  const trimmedNames = referenceNames.map((name) => name.trim()).filter((name) => name.length > 0);

  if (trimmedNames.length === 0) {
    return prompt;
  }

  return `${prompt}\n\n[References: ${trimmedNames.join(", ")}]`;
}

export function getOrderedGroupReferenceImages(
  group: Pick<ImageGroup, "referenceImageIds">,
  referenceImagesById: ReferenceImageLookup,
): Array<Pick<ReferenceImage, "id" | "name" | "url">> {
  return group.referenceImageIds.flatMap((referenceImageId) => {
    const image = referenceImagesById[referenceImageId];
    return image ? [image] : [];
  });
}

export function getOrderedGroupReferenceNames(
  group: Pick<ImageGroup, "referenceImageIds">,
  referenceImagesById: ReferenceImageLookup,
): string[] {
  return getOrderedGroupReferenceImages(group, referenceImagesById).map((image) => image.name);
}

export function selectVideoReferenceImageUrl(
  group: Pick<ImageGroup, "referenceImageIds">,
  referenceImagesById: ReferenceImageLookup,
): string | undefined {
  return getOrderedGroupReferenceImages(group, referenceImagesById)[0]?.url;
}

export function isDataUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "data:";
  } catch {
    return false;
  }
}

export function getMultiRefVideoCapabilityState(
  group: Pick<ImageGroup, "referenceImageIds">,
  referenceImagesById: ReferenceImageLookup,
  hasUploadCapability: boolean,
): MultiRefVideoCapabilityState {
  const orderedImages = getOrderedGroupReferenceImages(group, referenceImagesById);

  if (orderedImages.length === 0) {
    return {
      path: "unavailable",
      reason: "Group has no reference images.",
    };
  }

  const dataUrlImages = orderedImages.filter((image) => isDataUrl(image.url));

  if (dataUrlImages.length === 0) {
    return { path: "multi-ref" };
  }

  if (hasUploadCapability) {
    return {
      path: "upload-then-multi-ref",
      reason: `${dataUrlImages.length} image(s) will be uploaded to Atlas before generation.`,
      dataUrlImageIds: dataUrlImages.map((image) => image.id),
    };
  }

  const firstImage = orderedImages[0];

  if (!isDataUrl(firstImage.url)) {
    return {
      path: "bridge",
      reason: `${dataUrlImages.length} reference(s) are local data URLs; falling back to first image only.`,
      dataUrlImageIds: dataUrlImages.map((image) => image.id),
    };
  }

  return {
    path: "unavailable",
    reason: "The first reference image is a local data URL. Upload to Atlas or use a hosted URL.",
    dataUrlImageIds: dataUrlImages.map((image) => image.id),
  };
}

export function isMultiRefVideoCapable(
  group: Pick<ImageGroup, "referenceImageIds">,
  referenceImagesById: ReferenceImageLookup,
): boolean {
  const orderedImages = getOrderedGroupReferenceImages(group, referenceImagesById);

  return (
    orderedImages.length > 0 &&
    orderedImages.length === group.referenceImageIds.length &&
    orderedImages.every((image) => !isDataUrl(image.url))
  );
}
