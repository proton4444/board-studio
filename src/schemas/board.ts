import { z } from "zod";

const timestampSchema = z.string().datetime();

export const cardTypeSchema = z.enum(["prompt", "note", "output"]);

export const cardSchema = z.object({
  id: z.string().min(1),
  type: cardTypeSchema,
  content: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    w: z.number().positive(),
    h: z.number().positive(),
  }),
  createdAt: timestampSchema,
});

export const boardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  cards: z.array(cardSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const boardCollectionSchema = z.array(boardSchema);

export type CardType = z.infer<typeof cardTypeSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Board = z.infer<typeof boardSchema>;
