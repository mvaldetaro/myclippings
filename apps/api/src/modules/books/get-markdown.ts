import type { FastifyRequest, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { schema } from '@my-clippings/database';
import { buildBookPath, readMarkdownFile } from '@my-clippings/markdown';
import { getDb } from '../../lib/db';
import { env } from '../../config/env';
import { ForbiddenError, NotFoundError } from '../../lib/errors';

/**
 * Retorna o conteúdo raw do arquivo Markdown para visualização.
 *
 * GET /books/:bookId/markdown
 *
 * Fluxo:
 *  1. Busca o livro no file_index pelo bookId
 *  2. Verifica posse (userId do registro deve corresponder ao JWT)
 *  3. Lê o arquivo raw e responde com Content-Type: text/markdown
 */
export async function getMarkdownHandler(
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

  // Lê o arquivo Markdown como string para visualização
  const content = await readMarkdownFile(filePath);

  // Retorna como texto (não attachment), permitindo que o frontend renderize
  reply.header('Content-Type', 'text/markdown; charset=utf-8');

  return reply.send(content);
}
