import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { env } from '../config/env';

/**
 * Middleware centralizado de tratamento de erros.
 *
 * Converte diferentes tipos de erro em respostas HTTP padronizadas.
 * NUNCA expõe stack traces em produção (ARCHITECTURE §9.4).
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Erro de validação Zod (vem do schema nas rotas Fastify)
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Erro de validação',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Erros de domínio da aplicação
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  // Erro de validação do Fastify (schema validation)
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  // Rate limit excedido
  if ('statusCode' in error && error.statusCode === 429) {
    return reply.status(429).send({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas requisições. Tente novamente mais tarde.',
    });
  }

  // Erro de upload (limite de tamanho, etc.)
  if ('statusCode' in error && error.statusCode === 413) {
    return reply.status(413).send({
      error: 'FILE_TOO_LARGE',
      message: 'Arquivo excede o tamanho máximo permitido.',
    });
  }

  // Log do erro real para debugging
  request.log.error({ err: error }, 'Erro não tratado');

  // Em produção, nunca expor detalhes internos
  const isProduction = env.NODE_ENV === 'production';
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: isProduction ? 'Erro interno do servidor' : error.message,
  });
}

/**
 * Hook onRequest para adicionar correlationId a cada requisição (ARCHITECTURE §11.2).
 *
 * Se o cliente enviar x-correlation-id, usa ele. Caso contrário, gera um novo.
 * O valor fica disponível em request.correlationId para handlers e logs.
 *
 * O header de resposta é definido no hook onSend separado pois reply.header()
 * não é suportado no estágio onRequest do lifecycle do Fastify.
 */
export async function correlationIdHook(request: FastifyRequest, _reply: FastifyReply) {
  const correlationId =
    (request.headers['x-correlation-id'] as string) ||
    `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  request.correlationId = correlationId;
}

/**
 * Hook onSend que ecoa o correlationId no header da resposta.
 *
 * reply.header() é seguro no estágio onSend do lifecycle do Fastify.
 */
export async function correlationIdSendHook(
  request: FastifyRequest,
  reply: FastifyReply,
  _payload: unknown,
) {
  reply.header('x-correlation-id', request.correlationId);
}
