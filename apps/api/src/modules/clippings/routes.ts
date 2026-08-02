import { join } from 'node:path';
import { schema } from '@my-clippings/database';
import { deserializeBook, readMarkdownFile } from '@my-clippings/markdown';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { authenticate } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';

/** Responde com o conteúdo de um clipping lido do Markdown de um livro. */
async function readClippingFromBook(
  userId: string,
  bookId: string,
  clipId: string,
  db: ReturnType<typeof getDb>,
) {
  const book = await db
    .select()
    .from(schema.fileIndex)
    .where(and(eq(schema.fileIndex.bookId, bookId)))
    .get();

  if (!book) throw new NotFoundError('Livro');
  if (book.userId !== userId) throw new ForbiddenError();

  const filePath = join(env.DATA_DIR, book.relativePath);
  const markdown = await readMarkdownFile(filePath);
  const { clippings } = deserializeBook(markdown);
  return clippings.find((c) => c.id === clipId) ?? null;
}

// Schema de validação dos query params de listagem.
// Todos os filtros são opcionais; sort tem default "date-asc".
const ListClippingsQuery = z.object({
  text: z.string().optional(),
  type: z.enum(['destaque', 'nota', 'marcador']).optional(),
  page: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sort: z.enum(['date-asc', 'date-desc']).optional().default('date-asc'),
  favorites: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
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
      const { text, type, page, startDate, endDate, sort, favorites } = parsed.data;

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

      // Filtro de favoritos: restringe aos clippings marcados como favoritos pelo usuário
      if (favorites) {
        const favoritedIds = (
          await db
            .select({ clippingId: schema.clippingFavorites.clippingId })
            .from(schema.clippingFavorites)
            .where(
              and(
                eq(schema.clippingFavorites.userId, userId),
                eq(schema.clippingFavorites.bookId, bookId),
              ),
            )
            .all()
        ).map((r) => r.clippingId);
        filtered = filtered.filter((c) => favoritedIds.includes(c.id));
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

  // Alterna o estado de favorito de um clipping.
  // Se já for favorito, remove; se não for, adiciona.
  app.patch<{ Params: { bookId: string; clipId: string } }>(
    '/:bookId/:clipId/favorite',
    async (request, reply) => {
      const { bookId, clipId } = request.params;
      const userId = request.user.sub;
      const db = getDb();

      const clipping = await readClippingFromBook(userId, bookId, clipId, db);
      if (!clipping) throw new NotFoundError('Clipping');

      const existing = db
        .select()
        .from(schema.clippingFavorites)
        .where(
          and(
            eq(schema.clippingFavorites.userId, userId),
            eq(schema.clippingFavorites.clippingId, clipId),
          ),
        )
        .get();

      if (existing) {
        db.delete(schema.clippingFavorites)
          .where(
            and(
              eq(schema.clippingFavorites.userId, userId),
              eq(schema.clippingFavorites.clippingId, clipId),
            ),
          )
          .run();
        return reply.send({ favorited: false });
      }

      db.insert(schema.clippingFavorites).values({ userId, clippingId: clipId, bookId }).run();
      return reply.send({ favorited: true });
    },
  );

  // Lista todos os clippings favoritados pelo usuário.
  // Aceita filtro opcional por bookId.
  app.get<{ Querystring: { bookId?: string; sort?: 'date-asc' | 'date-desc' } }>(
    '/favorites',
    async (request, reply) => {
      const userId = request.user.sub;
      const { bookId: filterBookId, sort = 'date-desc' } = request.query;
      const db = getDb();

      const allFavorites = await db
        .select({
          clippingId: schema.clippingFavorites.clippingId,
          bookId: schema.clippingFavorites.bookId,
          favoritedAt: schema.clippingFavorites.favoritedAt,
        })
        .from(schema.clippingFavorites)
        .where(eq(schema.clippingFavorites.userId, userId))
        .all();

      if (allFavorites.length === 0) {
        return reply.send({ favorites: [] });
      }

      const favoritesByBook = new Map<string, string[]>();
      for (const fav of allFavorites) {
        if (filterBookId && fav.bookId !== filterBookId) continue;
        const ids = favoritesByBook.get(fav.bookId) ?? [];
        ids.push(fav.clippingId);
        favoritesByBook.set(fav.bookId, ids);
      }

      const results: Array<{
        id: string;
        type: string;
        content: string;
        page: number | null;
        locationStart: number;
        locationEnd: number;
        kindleDate: string;
        bookId: string;
        bookTitle: string;
        bookAuthor: string;
        favoritedAt: string;
      }> = [];

      for (const [bookId, clipIds] of favoritesByBook) {
        const book = db
          .select()
          .from(schema.fileIndex)
          .where(and(eq(schema.fileIndex.bookId, bookId), eq(schema.fileIndex.userId, userId)))
          .get();

        if (!book) continue;

        const filePath = join(env.DATA_DIR, book.relativePath);
        const markdown = await readMarkdownFile(filePath);
        const { clippings } = deserializeBook(markdown);

        for (const clipping of clippings) {
          if (clipIds.includes(clipping.id)) {
            const favRecord = allFavorites.find((f) => f.clippingId === clipping.id);
            results.push({
              ...clipping,
              bookId,
              bookTitle: book.title,
              bookAuthor: book.author,
              favoritedAt: favRecord?.favoritedAt ?? '',
            });
          }
        }
      }

      const sorted = results.sort((a, b) => {
        const aMs = new Date(a.favoritedAt).getTime();
        const bMs = new Date(b.favoritedAt).getTime();
        return sort === 'date-desc' ? bMs - aMs : aMs - bMs;
      });

      return reply.send({ favorites: sorted });
    },
  );
};
