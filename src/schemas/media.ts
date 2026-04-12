import { z } from "zod";

const timestampSchema = z.string().datetime();

export const generationStatusSchema = z.enum(["pending", "processing", "succeeded", "failed"]);
export const mediaKindSchema = z.enum(["image", "video", "text"]);

export const mediaItemSchema = z.object({
  id: z.string().min(1),
  type: mediaKindSchema,
  url: z.string().url().optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  meta: z.record(z.string(), z.unknown()),
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

export type GenerationStatus = z.infer<typeof generationStatusSchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type GenerationRecord = z.infer<typeof generationRecordSchema>;
