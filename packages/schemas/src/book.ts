import { z } from 'zod';
import { ClippingSummarySchema } from './clipping';

/** Um livro com seus metadados e clippings */
export const BookSchema = z.object({
  /** Identificador único e estável do livro */
  id: z.string().ulid(),
  /** Título original do livro */
  title: z.string().min(1),
  /** Autor do livro */
  author: z.string(),
  /** Slug do título para caminhos no sistema de arquivos */
  titleSlug: z.string(),
  /** Slug do autor para caminhos no sistema de arquivos */
  authorSlug: z.string(),
  /** Quantidade de clippings */
  clippingCount: z.number().int().nonnegative(),
  /** Data de criação do arquivo Markdown */
  createdAt: z.string().datetime(),
  /** Data da última atualização do arquivo Markdown */
  updatedAt: z.string().datetime(),
  /** Versão do schema do Markdown */
  schemaVersion: z.number().int().positive(),
});

export type Book = z.infer<typeof BookSchema>;

/** Livro com seus clippings completos */
export const BookWithClippingsSchema = BookSchema.extend({
  clippings: z.array(ClippingSummarySchema),
});

export type BookWithClippings = z.infer<typeof BookWithClippingsSchema>;

/** Identidade de um livro (título + autor normalizados) */
export const BookIdentitySchema = z.object({
  title: z.string().min(1),
  author: z.string(),
});

export type BookIdentity = z.infer<typeof BookIdentitySchema>;
