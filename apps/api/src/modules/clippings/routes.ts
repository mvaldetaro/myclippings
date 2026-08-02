import type { FastifyPluginAsync } from 'fastify';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { authenticate } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { env } from '../../config/env';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { schema } from '@my-clippings/database';
import { deserializeBook, readMarkdownFile } from '@my-clippings/markdown';

// Schema de validação dos query params de listagem.
// Todos os filtros são opcionais; sort tem default "date-asc".
const ListClippingsQuery = z.object({
  text: z.string().optional(),
  type: z.enum(['destaque', 'nota', 'marcador']).optional(),
  page: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sort: z.enum(['date-asc', 'date-desc']).optional().default('date-asc'),
});

type ListClippingsQuery = z.infer<typeof ListClippingsQuery>;

/**
 * Rotas de clippings (protegidas por JWT).
 *
 * GET /clippings/:bookId          — Lista clippings de um livro com filtros
 * GET /clippings/:bookId/:clipId  — Obtém um clipping individual
 */
export const clippingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate);

  // Lista clippings de um livro com filtros opcionais.
  app.get<{ Params: { bookId: string }; Querystring: ListClippingsQuery }>(
    '/:bookId',
    async (request, reply) => {
      const { bookId } = request.params;
      const userId = request.user.sub;

      // Valida filtros antes de qualquer IO (fail fast)
      const parsed = ListClippingsQuery.safeParse(request.query);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Filtros inválidos');
      }
      const { text, type, page, startDate, endDate, sort } = parsed.data;

      const db = getDb();

      // Busca o livro no file_index pelo bookId
      const book = await db
        .select()
        .from(schema.fileIndex)
        .where(and(eq(schema.fileIndex.bookId, bookId)))
        .get();

      // Livro não existe no índice
      if (!book) {
        throw new NotFoundError('Livro');
      }

      // Verifica posse: o userId do registro deve corresponder ao usuário do JWT
      if (book.userId !== userId) {
        throw new ForbiddenError();
      }

      // Lê e desserializa o arquivo Markdown do livro
      const filePath = join(env.DATA_DIR, book.relativePath);
      const markdown = await readMarkdownFile(filePath);
      const { clippings } = deserializeBook(markdown);

      // Aplica filtros opcionais
      let filtered = clippings;

      // Filtro de texto: busca case-insensitive no conteúdo
      if (text) {
        const needle = text.toLowerCase();
        filtered = filtered.filter((c) => c.content.toLowerCase().includes(needle));
      }

      // Filtro por tipo (destaque, nota, marcador)
      if (type) {
        filtered = filtered.filter((c) => c.type === type);
      }

      // Filtro por número de página exato
      if (page !== undefined) {
        filtered = filtered.filter((c) => c.page === page);
      }

      // Filtro por intervalo de kindleDate (ISO 8601)
      if (startDate) {
        const startMs = new Date(startDate).getTime();
        filtered = filtered.filter((c) => new Date(c.kindleDate).getTime() >= startMs);
      }
      if (endDate) {
        const endMs = new Date(endDate).getTime();
        filtered = filtered.filter((c) => new Date(c.kindleDate).getTime() <= endMs);
      }

      // Ordena por kindleDate (ascendente por padrão, descendente se solicitado)
      const sorted = [...filtered].sort((a, b) => {
        const aMs = new Date(a.kindleDate).getTime();
        const bMs = new Date(b.kindleDate).getTime();
        return sort === 'date-desc' ? bMs - aMs : aMs - bMs;
      });

      return reply.send({ clippings: sorted });
    },
  );

  // Obtém um clipping individual pelo fingerprint (clipId).
  app.get<{ Params: { bookId: string; clipId: string } }>(
    '/:bookId/:clipId',
    async (request, reply) => {
      const { bookId, clipId } = request.params;
      const userId = request.user.sub;

      const db = getDb();

      // Busca o livro no file_index pelo bookId
      const book = await db
        .select()
        .from(schema.fileIndex)
        .where(and(eq(schema.fileIndex.bookId, bookId)))
        .get();

      // Livro não existe no índice
      if (!book) {
        throw new NotFoundError('Livro');
      }

      // Verifica posse: o userId do registro deve corresponder ao usuário do JWT
      if (book.userId !== userId) {
        throw new ForbiddenError();
      }

      // Lê e desserializa o arquivo Markdown do livro
      const filePath = join(env.DATA_DIR, book.relativePath);
      const markdown = await readMarkdownFile(filePath);
      const { clippings } = deserializeBook(markdown);

      // Encontra o clipping pelo fingerprint (id exato)
      const clipping = clippings.find((c) => c.id === clipId);
      if (!clipping) {
        throw new NotFoundError('Clipping');
      }

      return reply.send(clipping);
    },
  );
};