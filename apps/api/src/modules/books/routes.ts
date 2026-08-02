import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../lib/auth';
import { listBooksHandler } from './list-books';
import { getBookHandler } from './get-book';
import { downloadBookHandler } from './download-book';
import { getMarkdownHandler } from './get-markdown';

/**
 * Rotas de livros (protegidas por JWT).
 *
 * GET /books                 — Lista livros do usuário (usa file_index)
 * GET /books/:bookId         — Obtém livro com clippings (lê do Markdown)
 * GET /books/:bookId/download — Download do arquivo Markdown original
 * GET /books/:bookId/markdown — Conteúdo raw do Markdown para visualização
 */
export const bookRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate);

  app.get('/', listBooksHandler);
  app.get('/:bookId', getBookHandler);
  app.get('/:bookId/download', downloadBookHandler);
  app.get('/:bookId/markdown', getMarkdownHandler);
};
