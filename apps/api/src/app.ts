import Fastify, { type FastifyInstance } from 'fastify';
import { loggerConfig } from './lib/logger';
import { registerPlugins } from './plugins/register';

// Decorators e tipos
import './lib/decorators';

export interface AppOptions {
  /** Desabilita o logger (útil em testes) */
  disableLogger?: boolean;
}

/**
 * Cria e configura a instância do Fastify com todos os plugins.
 *
 * As rotas devem ser registradas após a criação do app (via app.register).
 * A fábrica permite injeção de dependências nos testes.
 */
export async function createApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: options.disableLogger ? false : loggerConfig,
  });

  // Plugins globais
  await registerPlugins(app);

  // Health check - não requer auth
  await registerHealthRoutes(app);

  // Rotas de auth
  await registerAuthRoutes(app);

  // Rotas protegidas
  await registerImportRoutes(app);
  await registerBookRoutes(app);
  await registerClippingRoutes(app);
  await registerQuoteRoutes(app);
  await registerSettingsRoutes(app);

  return app;
}

// ── Importações dinâmicas para evitar dependências circulares ──

async function registerHealthRoutes(app: FastifyInstance) {
  const { healthRoutes } = await import('./routes/health');
  await app.register(healthRoutes, { prefix: '/api/health' });
}

async function registerAuthRoutes(app: FastifyInstance) {
  const { authRoutes } = await import('./modules/auth/routes');
  await app.register(authRoutes, { prefix: '/api/auth' });
}

async function registerImportRoutes(app: FastifyInstance) {
  const { importRoutes } = await import('./modules/imports/routes');
  await app.register(importRoutes, { prefix: '/api/imports' });
}

async function registerBookRoutes(app: FastifyInstance) {
  const { bookRoutes } = await import('./modules/books/routes');
  await app.register(bookRoutes, { prefix: '/api/books' });
}

async function registerClippingRoutes(app: FastifyInstance) {
  const { clippingRoutes } = await import('./modules/clippings/routes');
  await app.register(clippingRoutes, { prefix: '/api/clippings' });
}

async function registerQuoteRoutes(app: FastifyInstance) {
  const { quoteRoutes } = await import('./modules/quotes/routes');
  await app.register(quoteRoutes, { prefix: '/api/quotes' });
}

async function registerSettingsRoutes(app: FastifyInstance) {
  const { settingsRoutes } = await import('./modules/settings/routes');
  await app.register(settingsRoutes, { prefix: '/api/settings' });
}
