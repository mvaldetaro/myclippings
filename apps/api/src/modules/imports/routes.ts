import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../lib/auth';
import { importHandler } from './import-handler';

/**
 * Rotas de importação (protegidas por JWT).
 *
 * POST /imports: Upload do My Clippings.txt
 *   → valida arquivo → parse → agrupa por livro → lê Markdown existente →
 *   → calcula fingerprints → deduplica → atualiza Markdown atomicamente →
 *   → atualiza fileIndex → retorna resultado
 */
export const importRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas de import requerem autenticação
  app.addHook('onRequest', authenticate);

  // Rate limit mais restritivo para uploads
  app.post(
    '/',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: 60_000, // 10 uploads por minuto
        },
      },
    },
    importHandler,
  );
};
