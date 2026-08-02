import { schema } from '@my-clippings/database';
import { buildBookPath, deserializeBook, readMarkdownFile } from '@my-clippings/markdown';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { getDb } from '../../lib/db';
import { ForbiddenError, NotFoundError } from '../../lib/errors';

/**
 * Obtém um livro com seus clippings a partir do arquivo Markdown.
 *
 * GET /books/:bookId
 *
 * Fluxo:
 *  1. Busca o livro no file_index pelo bookId
 *  2. Verifica posse (userId do registro deve corresponder ao JWT)
 *  3. Lê e desserializa o arquivo Markdown
 *  4. Retorna { book: { id, title, author, ...frontMatter }, clippings: [...] }
 */
export async function getBookHandler(
  request: FastifyRequest<{ Params: { bookId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { bookId } = request.params;
  const userId = request.user.sub;

  const db = getDb();

  // Busca o livro no file_index pelo bookId
  const indexRow = await db
    .select()
    .from(schema.fileIndex)
    .where(and(eq(schema.fileIndex.bookId, bookId)))
    .get();

  // Livro não encontrado no índice
  if (!indexRow) {
    throw new NotFoundError('Livro');
  }

  // Verifica posse: o userId do registro deve corresponder ao usuário do JWT
  if (indexRow.userId !== userId) {
    throw new ForbiddenError();
  }

  // Constrói o caminho do arquivo Markdown usando buildBookPath
  const { filePath } = buildBookPath({
    baseDir: env.DATA_DIR,
    userId,
    author: indexRow.author,
    title: indexRow.title,
    bookId,
  });

  // Lê e desserializa o arquivo Markdown
  const markdown = await readMarkdownFile(filePath);
  const { frontMatter, clippings } = deserializeBook(markdown);

  // Retorna o livro com seus metadados do front matter e os clippings
  return reply.send({
    book: {
      id: frontMatter.bookId,
      title: frontMatter.title,
      author: frontMatter.author,
      coverUrl: frontMatter.coverUrl ?? indexRow.coverUrl ?? null,
      createdAt: frontMatter.createdAt,
      updatedAt: frontMatter.updatedAt,
      clippingCount: frontMatter.clippingCount,
      schemaVersion: frontMatter.schemaVersion,
    },
    clippings,
  });
}
