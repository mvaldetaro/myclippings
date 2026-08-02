import { z } from 'zod';

/** Tipo de clipping do Kindle */
export const ClippingType = z.enum(['destaque', 'nota', 'marcador']);
export type ClippingType = z.infer<typeof ClippingType>;

/** Um clipping individual extraído do arquivo do Kindle */
export const ClippingSchema = z.object({
  /** Identificador determinístico do clipping (SHA-256 fingerprint) */
  id: z.string(),
  /** Identificador do livro ao qual pertence */
  bookId: z.string().ulid(),
  /** Tipo do clipping (destaque, nota, marcador) */
  type: ClippingType,
  /** Conteúdo original do clipping */
  content: z.string(),
  /** Número da página (opcional) */
  page: z.number().int().positive().nullable(),
  /** Localização inicial no Kindle */
  locationStart: z.number().int().positive(),
  /** Localização final no Kindle */
  locationEnd: z.number().int().positive(),
  /** Data registrada pelo Kindle */
  kindleDate: z.string().datetime(),
  /** Data de criação do registro no sistema */
  createdAt: z.string().datetime(),
});

export type Clipping = z.infer<typeof ClippingSchema>;

/** Clipping sem o fingerprint (antes do cálculo) */
export const RawClippingSchema = ClippingSchema.omit({
  id: true,
  bookId: true,
  createdAt: true,
}).extend({
  /** Título do livro (antes de resolver o bookId) */
  title: z.string(),
  /** Autor do livro (antes de resolver o bookId) */
  author: z.string().optional(),
});

export type RawClipping = z.infer<typeof RawClippingSchema>;

/** Metadados de um clipping para sumário */
export const ClippingSummarySchema = z.object({
  id: z.string(),
  type: ClippingType,
  contentPreview: z.string(),
  page: z.number().int().positive().nullable(),
  kindleDate: z.string().datetime(),
});

export type ClippingSummary = z.infer<typeof ClippingSummarySchema>;
