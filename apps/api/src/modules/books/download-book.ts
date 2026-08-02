import type { FastifyRequest, FastifyReply } from 'fastify';
import { readFile } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { schema } from '@my-clippings/database';
import { buildBookPath } from '@my-clippings/markdown';
import { getDb } from '../../lib/db';
import { env } from '../../config/env';
import { ForbiddenError, NotFoundError } from '../../lib/errors';

/**
 * Serve o arquivo Markdown original como download.
 *
 * GET /books/:bookId/download
 *
 * Fluxo:
 *  1. Busca o livro no file_index pelo bookId
 *  2. Verifica posse (userId do registro deve corresponder ao JWT)
 *  3. Lê o arquivo raw e responde com Content-Type: text/markdown
 *     e Content-Disposition: attachment
 */
export async function downloadBookHandler(
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

  // Lê o arquivo Markdown como buffer para servir como download
  const content = await readFile(filePath, 'utf-8');

  // Define headers para download
  reply.header('Content-Type', 'text/markdown; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="${indexRow.title}.md"`);

  return reply.send(content);
}
