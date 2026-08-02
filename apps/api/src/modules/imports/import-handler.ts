import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import { ulid } from 'ulid';
import { eq, and } from 'drizzle-orm';
import { schema } from '@my-clippings/database';
import { parseClippingsFile, toRawClipping } from '@my-clippings/kindle-parser';
import {
  buildBookPath,
  deserializeBook,
  serializeBook,
  computeFingerprint,
  readMarkdownFile,
  writeMarkdownFile,
  fileExists,
  ensureDirectory,
  lockManager,
} from '@my-clippings/markdown';
import type { MarkdownClipping } from '@my-clippings/markdown';
import { createBookIdentity, normalizeBookIdentity } from '@my-clippings/domain';
import type { ImportResult } from '@my-clippings/domain';
import { getDb } from '../../lib/db';
import { env } from '../../config/env';
import { ValidationError, InternalError } from '../../lib/errors';

/** Grupo de clippings pertencentes ao mesmo livro (identidade normalizada) */
interface BookGroup {
  title: string;
  author: string;
  records: ReturnType<typeof toRawClipping>[];
}

/**
 * Handler de importação de arquivo My Clippings.txt (SPEC §4, ARCHITECTURE §4.2).
 *
 * Fluxo:
 *  1. Recebe upload multipart → valida → lê buffer
 *  2. Calcula hash SHA-256 do arquivo original
 *  3. Cria registro de importação (status: processing)
 *  4. Faz o parsing via kindle-parser
 *  5. Agrupa registros por identidade do livro (título + autor normalizados)
 *  6. Resolve bookIds consultando o file_index do usuário
 *  7. Para cada livro:
 *     a. Lê Markdown existente (se houver) e extrai fingerprints dos clippings
 *     b. Computa fingerprints dos novos clippings
 *     c. Descarta duplicados (fingerprint já presente)
 *     d. Adquire lock → serializa → escreve atomicamente → libera lock
 *     e. Atualiza/insere linha no file_index
 *  8. Atualiza registro de importação (status: completed)
 *  9. Retorna ImportResult
 *
 * Em qualquer erro, o registro de importação é marcado como 'failed' e o erro
 * é relançado para o middleware centralizado de erros.
 */
export async function importHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // ── 1. Valida e lê o arquivo multipart ──────────────────────────────────────
  if (!request.isMultipart()) {
    throw new ValidationError('Requisição deve ser multipart/form-data com um arquivo');
  }

  const file = await request.file();
  if (!file) {
    throw new ValidationError('Nenhum arquivo enviado no upload');
  }

  const filename = file.filename;
  const buffer = await file.toBuffer();

  if (buffer.length === 0) {
    throw new ValidationError('Arquivo vazio');
  }

  // ── 2. Hash SHA-256 do arquivo original ─────────────────────────────────────
  const fileHash = `sha256:${createHash('sha256').update(buffer).digest('hex')}`;

  // ── 3. Parsing do arquivo My Clippings.txt ──────────────────────────────────
  const parseResult = parseClippingsFile(buffer);
  const totalRecords = parseResult.records.length + parseResult.invalidCount;

  // ── 4. Identifica usuário e cria registro de importação ─────────────────────
  const userId = request.user.sub;
  const db = getDb();
  const importId = ulid();
  const startedAt = new Date().toISOString();

  await db.insert(schema.imports).values({
    id: importId,
    userId,
    filename,
    fileHash,
    status: 'processing',
    totalRecords,
    importedRecords: 0,
    duplicateRecords: 0,
    invalidRecords: parseResult.invalidCount,
    startedAt,
    completedAt: null,
    errorMessage: null,
  });

  try {
    // ── 5. Agrupa registros por identidade do livro ────────────────────────────
    const groups = new Map<string, BookGroup>();
    for (const record of parseResult.records) {
      const identity = normalizeBookIdentity(createBookIdentity(record.title, record.author));
      const key = `${identity.title.toLowerCase()}|${identity.author.toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.records.push(toRawClipping(record));
      } else {
        groups.set(key, {
          title: identity.title,
          author: identity.author,
          records: [toRawClipping(record)],
        });
      }
    }

    // ── 6. Resolve bookIds consultando o file_index do usuário ────────────────
    const userIndexRows = await db
      .select()
      .from(schema.fileIndex)
      .where(eq(schema.fileIndex.userId, userId))
      .all();

    const bookIdByKey = new Map<string, string>();
    for (const row of userIndexRows) {
      const identity = normalizeBookIdentity(createBookIdentity(row.title, row.author));
      const key = `${identity.title.toLowerCase()}|${identity.author.toLowerCase()}`;
      bookIdByKey.set(key, row.bookId);
    }

    // ── 7. Processa cada livro ─────────────────────────────────────────────────
    let importedRecords = 0;
    let duplicateRecords = 0;
    const updatedBooks: string[] = [];

    for (const group of groups.values()) {
      const key = `${group.title.toLowerCase()}|${group.author.toLowerCase()}`;
      // Reutiliza o bookId existente ou gera um novo ULID
      const bookId = bookIdByKey.get(key) ?? ulid();

      const { filePath, relativePath } = buildBookPath({
        baseDir: env.DATA_DIR,
        userId,
        author: group.author,
        title: group.title,
        bookId,
      });

      // 7a. Lê Markdown existente e coleta fingerprints dos clippings
      let existingClippings: MarkdownClipping[] = [];
      let createdAt = new Date().toISOString();
      let schemaVersion = 1;

      const exists = await fileExists(filePath);
      if (exists) {
        try {
          const content = await readMarkdownFile(filePath);
          const deserialized = deserializeBook(content);
          existingClippings = deserialized.clippings;
          createdAt = deserialized.frontMatter.createdAt;
          schemaVersion = deserialized.frontMatter.schemaVersion;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new InternalError(
            `Falha ao ler Markdown existente do livro "${group.title}": ${reason}`,
          );
        }
      }

      const existingFingerprints = new Set(existingClippings.map((c) => c.id));

      // 7b. Computa fingerprints e descarta duplicados
      const newClippings: MarkdownClipping[] = [];
      for (const raw of group.records) {
        const fingerprint = computeFingerprint({
          bookId,
          type: raw.type,
          content: raw.content,
          page: raw.page,
          locationStart: raw.locationStart,
          locationEnd: raw.locationEnd,
          kindleDate: raw.kindleDate,
        });

        // Duplicado em relação ao Markdown existente
        if (existingFingerprints.has(fingerprint)) {
          duplicateRecords++;
          continue;
        }

        // Duplicado dentro do próprio lote desta importação
        if (newClippings.some((c) => c.id === fingerprint)) {
          duplicateRecords++;
          continue;
        }

        newClippings.push({
          id: fingerprint,
          type: raw.type,
          content: raw.content,
          page: raw.page,
          locationStart: raw.locationStart,
          locationEnd: raw.locationEnd,
          kindleDate: raw.kindleDate,
        });
      }

      // 7c. Se não há novos clippings, pula este livro
      if (newClippings.length === 0) {
        continue;
      }

      // 7d. Adquire lock, serializa e escreve atomicamente
      const release = await lockManager.acquire(bookId);
      try {
        const combined = [...existingClippings, ...newClippings];
        const updatedAt = new Date().toISOString();

        const serialized = serializeBook({
          bookId,
          title: group.title,
          author: group.author,
          createdAt,
          updatedAt,
          schemaVersion,
          clippings: combined,
        });

        await ensureDirectory(filePath);
        await writeMarkdownFile(filePath, serialized.content);

        importedRecords += newClippings.length;
        updatedBooks.push(bookId);

        // 7e. Atualiza ou insere linha no file_index
        const indexRow = await db
          .select()
          .from(schema.fileIndex)
          .where(and(eq(schema.fileIndex.userId, userId), eq(schema.fileIndex.bookId, bookId)))
          .get();

        const now = new Date().toISOString();
        if (indexRow) {
          await db
            .update(schema.fileIndex)
            .set({
              relativePath,
              title: group.title,
              author: group.author,
              clippingCount: serialized.clippingCount,
              fileModifiedAt: now,
              indexedAt: now,
            })
            .where(eq(schema.fileIndex.bookId, bookId));
        } else {
          await db.insert(schema.fileIndex).values({
            userId,
            bookId,
            relativePath,
            title: group.title,
            author: group.author,
            clippingCount: serialized.clippingCount,
            fileHash: null,
            fileModifiedAt: now,
            indexedAt: now,
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new InternalError(`Falha ao escrever Markdown do livro "${group.title}": ${reason}`);
      } finally {
        release();
      }
    }

    // ── 8. Atualiza registro de importação como concluído ──────────────────────
    const completedAt = new Date().toISOString();
    await db
      .update(schema.imports)
      .set({
        status: 'completed',
        importedRecords,
        duplicateRecords,
        completedAt,
        errorMessage: null,
      })
      .where(eq(schema.imports.id, importId));

    // ── 9. Retorna ImportResult ───────────────────────────────────────────────
    const result: ImportResult = {
      importId,
      status: 'completed',
      totalRecords,
      importedRecords,
      duplicateRecords,
      invalidRecords: parseResult.invalidCount,
      updatedBooks,
    };

    return reply.send(result);
  } catch (error) {
    // Marca a importação como falhada e relança o erro
    const errorMessage = error instanceof Error ? error.message : String(error);
    const completedAt = new Date().toISOString();
    await db
      .update(schema.imports)
      .set({
        status: 'failed',
        completedAt,
        errorMessage,
      })
      .where(eq(schema.imports.id, importId));

    throw error;
  }
}