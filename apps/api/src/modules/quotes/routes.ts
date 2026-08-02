import type { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { join } from 'node:path';
import { authenticate } from '../../lib/auth';
import { getDb } from '../../lib/db';
import { env } from '../../config/env';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { schema } from '@my-clippings/database';
import { deserializeBook, readMarkdownFile } from '@my-clippings/markdown';
import type { MarkdownFrontMatter, MarkdownClipping } from '@my-clippings/markdown';
import { generateQuoteImage } from '@my-clippings/quote-generator';
import type { QuotePreferences } from '@my-clippings/schemas';
import type { Book, Clipping } from '@my-clippings/domain';
import { DEFAULT_QUOTE_PREFERENCES } from '../settings/routes';

/**
 * Converte MarkdownFrontMatter do pacote markdown para o tipo Book do domínio.
 * Preenche campos não relevantes para geração de imagem com valores padrão.
 */
function toDomainBook(frontMatter: MarkdownFrontMatter): Book {
  return {
    id: frontMatter.bookId,
    title: frontMatter.title,
    author: frontMatter.author,
    titleSlug: '',
    authorSlug: '',
    clippingCount: frontMatter.clippingCount,
    createdAt: frontMatter.createdAt,
    updatedAt: frontMatter.updatedAt,
    schemaVersion: frontMatter.schemaVersion,
  };
}

/**
 * Converte MarkdownClipping do pacote markdown para o tipo Clipping do domínio.
 * O bookId e createdAt não são usados pelo renderer, mas são exigidos pelo tipo.
 */
function toDomainClipping(clip: MarkdownClipping, bookId: string): Clipping {
  return {
    id: clip.id,
    bookId,
    type: clip.type,
    content: clip.content,
    page: clip.page,
    locationStart: clip.locationStart,
    locationEnd: clip.locationEnd,
    kindleDate: clip.kindleDate,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Rotas de geração de imagem de citação (protegidas por JWT).
 *
 * GET /quotes/:bookId/:clipId           — Pré-visualização da imagem (image/png inline)
 * GET /quotes/:bookId/:clipId/download  — Download da imagem (Content-Disposition: attachment)
 */
export const quoteRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate);

  /**
   * Busca as preferências de citação do usuário.
   * Usa os defaults caso o registro não exista no banco.
   */
  async function getQuotePreferences(userId: string): Promise<QuotePreferences> {
    const db = getDb();
    const settings = await db
      .select({ quotePreferences: schema.userSettings.quotePreferences })
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .get();

    if (!settings) {
      return DEFAULT_QUOTE_PREFERENCES;
    }

    // quotePreferences é armazenado como JSON string no SQLite
    const stored = settings.quotePreferences as Record<string, unknown> | null;
    if (!stored || typeof stored !== 'object') {
      return DEFAULT_QUOTE_PREFERENCES;
    }

    return {
      backgroundColor:
        typeof stored.backgroundColor === 'string' ? stored.backgroundColor : DEFAULT_QUOTE_PREFERENCES.backgroundColor,
      textColor:
        typeof stored.textColor === 'string' ? stored.textColor : DEFAULT_QUOTE_PREFERENCES.textColor,
      showAuthor:
        typeof stored.showAuthor === 'boolean' ? stored.showAuthor : DEFAULT_QUOTE_PREFERENCES.showAuthor,
      showBookTitle:
        typeof stored.showBookTitle === 'boolean' ? stored.showBookTitle : DEFAULT_QUOTE_PREFERENCES.showBookTitle,
    };
  }

  /**
   * Busca o livro e clipping, verifica posse e gera a imagem PNG.
   *
   * @param overrides - Preferências opcionais que sobrescrevem as salvas no banco.
   *                    Útil para preview inline com alterações visuais em tempo real.
   */
  async function generateQuote(
    bookId: string,
    clipId: string,
    userId: string,
    overrides?: Partial<QuotePreferences>,
  ): Promise<Buffer> {
    const db = getDb();

    // Busca o livro no file_index
    const fileRecord = await db
      .select()
      .from(schema.fileIndex)
      .where(and(eq(schema.fileIndex.bookId, bookId)))
      .get();

    if (!fileRecord) {
      throw new NotFoundError('Livro');
    }

    // Verifica posse
    if (fileRecord.userId !== userId) {
      throw new ForbiddenError();
    }

    // Lê o Markdown do livro
    const filePath = join(env.DATA_DIR, fileRecord.relativePath);
    const markdown = await readMarkdownFile(filePath);
    const { frontMatter, clippings } = deserializeBook(markdown);

    // Encontra o clipping pelo fingerprint
    const markdownClip = clippings.find((c) => c.id === clipId);
    if (!markdownClip) {
      throw new NotFoundError('Clipping');
    }

    // Busca preferências do usuário (salvas no banco)
    const saved = await getQuotePreferences(userId);

    // Aplica overrides de query params sobre as preferências salvas
    const preferences: QuotePreferences = {
      backgroundColor: overrides?.backgroundColor ?? saved.backgroundColor,
      textColor: overrides?.textColor ?? saved.textColor,
      showAuthor: overrides?.showAuthor ?? saved.showAuthor,
      showBookTitle: overrides?.showBookTitle ?? saved.showBookTitle,
    };

    // Converte para os tipos do domínio exigidos pelo gerador
    const domainBook = toDomainBook(frontMatter);
    const domainClipping = toDomainClipping(markdownClip, bookId);

    // Gera a imagem PNG
    return generateQuoteImage(domainClipping, domainBook, preferences);
  }

  /**
   * Extrai overrides de preferências dos query params da requisição.
   * Valores presentes nos query params sobrescrevem as preferências salvas.
   */
  function parseOverrideParams(
    query: Record<string, string | string[] | undefined>,
  ): Partial<QuotePreferences> {
    const overrides: Partial<QuotePreferences> = {};

    const bg = typeof query.bg === 'string' ? query.bg : undefined;
    const text = typeof query.text === 'string' ? query.text : undefined;
    const showAuthor = typeof query.showAuthor === 'string' ? query.showAuthor : undefined;
    const showBookTitle = typeof query.showBookTitle === 'string' ? query.showBookTitle : undefined;

    if (bg && /^#[0-9a-fA-F]{6}$/.test(bg)) overrides.backgroundColor = bg;
    if (text && /^#[0-9a-fA-F]{6}$/.test(text)) overrides.textColor = text;
    if (showAuthor === 'true') overrides.showAuthor = true;
    if (showAuthor === 'false') overrides.showAuthor = false;
    if (showBookTitle === 'true') overrides.showBookTitle = true;
    if (showBookTitle === 'false') overrides.showBookTitle = false;

    return overrides;
  }

  // Pré-visualização: retorna a imagem inline
  app.get<{ Params: { bookId: string; clipId: string } }>(
    '/:bookId/:clipId',
    async (request, reply) => {
      const { bookId, clipId } = request.params;
      const userId = request.user.sub;
      const overrides = parseOverrideParams(request.query as Record<string, string | undefined>);

      const pngBuffer = await generateQuote(bookId, clipId, userId, overrides);

      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=300')
        .send(pngBuffer);
    },
  );

  // Download: retorna a imagem como anexo
  app.get<{ Params: { bookId: string; clipId: string } }>(
    '/:bookId/:clipId/download',
    async (request, reply) => {
      const { bookId, clipId } = request.params;
      const userId = request.user.sub;
      const overrides = parseOverrideParams(request.query as Record<string, string | undefined>);

      const pngBuffer = await generateQuote(bookId, clipId, userId, overrides);

      // Busca o livro apenas para compor o nome do arquivo no download
      const db = getDb();
      const fileRecord = await db
        .select({ title: schema.fileIndex.title })
        .from(schema.fileIndex)
        .where(and(eq(schema.fileIndex.bookId, bookId)))
        .get();

      const safeTitle = fileRecord?.title
        ? fileRecord.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, '').trim() || 'citacao'
        : 'citacao';

      return reply
        .header('Content-Type', 'image/png')
        .header('Content-Disposition', `attachment; filename="${safeTitle}-citacao.png"`)
        .header('Cache-Control', 'no-cache')
        .send(pngBuffer);
    },
  );
};
