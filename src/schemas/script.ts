import { z } from "zod";

export const shotSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  scriptId: z.string().min(1),
  order: z.number().int().min(0),
  act: z.string().optional(),
  scene: z.string().optional(),
  prompt: z.string(),
  referenceGroupId: z.string().optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  outputGenerationId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const scriptSchema = z.object({
  id: z.string().min(1),
  boardId: z.string().min(1),
  name: z.string().min(1),
  shots: z.array(shotSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Shot = z.infer<typeof shotSchema>;
export type Script = z.infer<typeof scriptSchema>;
