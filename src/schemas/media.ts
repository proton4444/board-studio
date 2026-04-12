import { z } from "zod";

const timestampSchema = z.string().datetime();
const urlSchema = z.string().min(1).refine((value) => {
  try {
    // `URL` accepts both remote URLs and data URLs, which lets the MVP persist
    // uploaded references locally when no true file-upload endpoint exists.
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "Invalid URL");

export const generationStatusSchema = z.enum(["pending", "processing", "succeeded", "failed"]);
export const mediaKindSchema = z.enum(["image", "video", "text"]);

export const mediaItemSchema = z.object({
  id: z.string().min(1),
  type: mediaKindSchema,
  url: urlSchema.optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  meta: z.record(z.string(), z.unknown()),
});

export const referenceImageSchema = mediaItemSchema.extend({
  boardId: z.string().min(1),
  type: z.literal("image"),
  url: urlSchema,
  name: z.string().min(1),
  createdAt: timestampSchema,
});

export const imageGroupSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  name: z.string().min(1),
  referenceImageIds: z.array(z.string().min(1)),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const generationRecordSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  prompt: z.string().min(1),
  model: z.string().min(1),
  provider: z.string().min(1),
  status: generationStatusSchema,
  createdAt: timestampSchema,
  completedAt: timestampSchema.optional(),
  error: z.string().min(1).optional(),
  output: z.array(mediaItemSchema).optional(),
});

export const generationCollectionSchema = z.array(generationRecordSchema);
export const referenceImageCollectionSchema = z.array(referenceImageSchema);

export type GenerationStatus = z.infer<typeof generationStatusSchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type GenerationRecord = z.infer<typeof generationRecordSchema>;
export type ReferenceImage = z.infer<typeof referenceImageSchema>;
export type ImageGroup = z.infer<typeof imageGroupSchema>;
