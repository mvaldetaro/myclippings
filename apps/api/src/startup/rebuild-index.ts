import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { FastifyBaseLogger } from 'fastify';
import type { Database } from '@my-clippings/database';
import { schema } from '@my-clippings/database';
import { readFrontMatter } from '@my-clippings/markdown';
import { eq, and } from 'drizzle-orm';
import { env } from '../config/env';

export interface RebuildResult {
  indexed: number;
  skipped: number;
  errors: number;
}

/**
 * Reconstrói o file_index a partir dos arquivos Markdown no disco (RNF-005).
 *
 * Percorre /data/users/, localiza clippings.md, lê o front matter,
 * e atualiza a tabela file_index. Arquivos que não puderem ser lidos
 * são registrados como erro no log mas NÃO são removidos.
 *
 * O índice é completamente reconstruível — o conteúdo dos clippings
 * nunca é armazenado no banco (ARCHITECTURE §10.1).
 */
export async function rebuildIndex(
  log: FastifyBaseLogger,
  db: Database,
): Promise<RebuildResult> {
  const userFilesDir = env.USER_FILES_DIR;
  const result: RebuildResult = { indexed: 0, skipped: 0, errors: 0 };

  async function walkUserDir(userId: string, userDir: string) {
    try {
      const entries = await readdir(userDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const authorDir = join(userDir, entry.name);

        // Entra no diretório do autor
        const authorEntries = await readdir(authorDir, { withFileTypes: true });

        for (const bookEntry of authorEntries) {
          if (!bookEntry.isDirectory()) continue;
          const bookDir = join(authorDir, bookEntry.name);
          const mdPath = join(bookDir, 'clippings.md');

          try {
            // Verifica se o arquivo existe
            const fileStats = await stat(mdPath);
            if (!fileStats.isFile()) continue;

            // Lê apenas o front matter (sem processar todos os clippings)
            const { readFile } = await import('node:fs/promises');
            const content = await readFile(mdPath, 'utf-8');
            const fm = readFrontMatter(content);

            // Caminho relativo para persistir no índice
            const relativePath = relative(userFilesDir, mdPath);

            // Atualiza ou insere no file_index
            const existing = await db
              .select()
              .from(schema.fileIndex)
              .where(
                and(
                  eq(schema.fileIndex.userId, userId),
                  eq(schema.fileIndex.bookId, fm.bookId),
                ),
              )
              .get();

            if (existing) {
              await db
                .update(schema.fileIndex)
                .set({
                  title: fm.title,
                  author: fm.author,
                  clippingCount: fm.clippingCount,
                  fileHash: null, // Recalculado na próxima verificação
                  fileModifiedAt: fileStats.mtime.toISOString(),
                  indexedAt: new Date().toISOString(),
                })
                .where(eq(schema.fileIndex.bookId, fm.bookId));
            } else {
              await db.insert(schema.fileIndex).values({
                userId,
                bookId: fm.bookId,
                relativePath,
                title: fm.title,
                author: fm.author,
                clippingCount: fm.clippingCount,
                fileHash: null,
                fileModifiedAt: fileStats.mtime.toISOString(),
                indexedAt: new Date().toISOString(),
              });
            }

            result.indexed++;
          } catch {
            // Arquivo corrompido ou inacessível — loga e continua
            log.warn({ file: mdPath }, 'Arquivo Markdown ignorado durante reconstrução');
            result.errors++;
          }
        }
      }
    } catch {
      // Diretório do usuário pode não existir
      log.debug({ dir: userDir }, 'Diretório de usuário não encontrado');
    }
  }

  // Percorre cada usuário
  try {
    const userEntries = await readdir(userFilesDir, { withFileTypes: true });

    for (const userEntry of userEntries) {
      if (!userEntry.isDirectory() || userEntry.name === 'books') {
        // Pode haver uma estrutura users/{userId}/ diretamente ou users/{userId}/books/
        if (userEntry.isDirectory()) {
          const booksDir = join(userFilesDir, userEntry.name, 'books');
          await walkUserDir(userEntry.name, booksDir);
        }
      }
    }
  } catch {
    log.info({ dir: userFilesDir }, 'Diretório de usuários não encontrado — ignorando rebuild');
  }

  return result;
}
