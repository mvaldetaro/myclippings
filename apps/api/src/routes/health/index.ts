import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../../lib/db';
import { schema } from '@my-clippings/database';
import { env } from '../../config/env';
import { access } from 'node:fs/promises';

/**
 * Rotas de health check (ARCHITECTURE §11.3).
 *
 * - GET /health: liveness — processo está rodando
 * - GET /health/ready: readiness — pronto para receber tráfego (DB + filesystem ok)
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  /** Liveness: retorna 200 se o processo está vivo */
  app.get('/', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  /** Readiness: verifica DB e sistema de arquivos */
  app.get('/ready', async (_request, reply) => {
    const checks: Record<string, string> = {};

    // Check SQLite — consulta a tabela users (sempre existe após migrations)
    try {
      const db = getDb();
      await db.select().from(schema.users).limit(1).all();
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Check filesystem
    try {
      await access(env.USER_FILES_DIR);
      checks.filesystem = 'ok';
    } catch {
      checks.filesystem = 'error';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');
    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ready' : 'not ready',
      checks,
    });
  });
};
