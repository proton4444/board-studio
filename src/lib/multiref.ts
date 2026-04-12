import type { ImageGroup, ReferenceImage } from "../schemas/media";

type ReferenceImageLookup = Record<string, Pick<ReferenceImage, "id" | "name" | "url"> | undefined>;

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
