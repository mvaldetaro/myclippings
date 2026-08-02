/**
 * Tipagem dos decorators injetados no Fastify.
 */
import type {} from 'fastify';
import type {} from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    /** Correlation ID da requisição (ARCHITECTURE §11.2) */
    correlationId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
    };
    user: {
      sub: string;
      email: string;
    };
  }
}
