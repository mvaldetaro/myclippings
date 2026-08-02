import { schema } from '@my-clippings/database';
import { and, eq, like, or } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDb } from '../../lib/db';

/**
 * Lista os livros do usuário autenticado a partir da tabela file_index.
 *
 * Suporta busca opcional por título ou autor via query param `search`.
 *
 * GET /books?search=termo
 */
export async function listBooksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.user.sub;
  const db = getDb();

  const query = request.query as Record<string, string | undefined>;
  const search = query.search;

  // Monta a condição WHERE: sempre filtra pelo userId
  // Se houver busca, adiciona condição LIKE em título e autor
  let whereClause;
  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    whereClause = and(
      eq(schema.fileIndex.userId, userId),
      or(like(schema.fileIndex.title, pattern), like(schema.fileIndex.author, pattern)),
    );
  } else {
    whereClause = eq(schema.fileIndex.userId, userId);
  }

  const rows = await db
    .select({
      id: schema.fileIndex.bookId,
      title: schema.fileIndex.title,
      author: schema.fileIndex.author,
      coverUrl: schema.fileIndex.coverUrl,
      clippingCount: schema.fileIndex.clippingCount,
      updatedAt: schema.fileIndex.indexedAt,
      schemaVersion: schema.fileIndex.indexedAt, // placeholder — file_index não armazena schemaVersion
    })
    .from(schema.fileIndex)
    .where(whereClause)
    .all();

  // Mapeia as linhas para o formato de resposta (schemaVersion não está disponível no DB)
  const books = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.coverUrl ?? null,
    clippingCount: row.clippingCount,
    updatedAt: row.updatedAt,
    schemaVersion: 1,
  }));

  return reply.send({ books });
}
