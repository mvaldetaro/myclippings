import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifyJwt from '@fastify/jwt';
import { env } from '../config/env';
import { errorHandler, correlationIdHook, correlationIdSendHook } from '../lib/error-handler';

/**
 * Registra todos os plugins do Fastify no servidor.
 *
 * Ordem de registro importa: error handler e correlationId
 * são registrados como hooks globais ANTES dos plugins.
 */
export async function registerPlugins(app: FastifyInstance) {
  // ── Hooks globais ──
  // Correlation ID: define no onRequest, ecoa no onSend
  app.addHook('onRequest', correlationIdHook);
  app.addHook('onSend', correlationIdSendHook);

  // ── Cookie ──
  await app.register(fastifyCookie);

  // ── CORS ──
  await app.register(fastifyCors, {
    origin: env.WEB_APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });

  // ── Segurança ──
  await app.register(fastifyHelmet, {
    // CSP configurada para permitir o frontend
    contentSecurityPolicy: false, // CSP será configurada no web app
  });

  // ── Rate Limiting ──
  await app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    // Global: aplica a todas as rotas; rotas sensíveis podem sobrescrever
  });

  // ── Upload de arquivos ──
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_SIZE,
      files: 1, // Apenas um arquivo por upload
    },
  });

  // ── JWT ──
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRATION,
    },
    cookie: {
      cookieName: 'token',
      signed: false, // cookie não assinado; proteção vem do httpOnly + Secure + SameSite
    },
  });

  // ── Error Handler (DEVE ser registrado por último) ──
  app.setErrorHandler(errorHandler);
}
