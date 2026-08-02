import { env } from '../config/env';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Cria um logger filho com correlationId.
 * O correlationId é extraído dos headers da requisição (x-correlation-id)
 * ou gerado automaticamente pelo hook onRequest no plugin de logging.
 */
export function createLogger(parent: FastifyBaseLogger, correlationId?: string) {
  const child = parent.child({});
  if (correlationId) {
    return child.child({ correlationId });
  }
  return child;
}

/**
 * Configuração base do logger (pino).
 */
export const loggerConfig = {
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
};
