import 'dotenv/config';

/**
 * Configuração tipada da aplicação a partir de variáveis de ambiente.
 *
 * Todas as variáveis possuem defaults seguros para desenvolvimento.
 * Em produção, devem ser explicitamente configuradas.
 */
export const env = {
  // ── Servidor ──
  PORT: Number(process.env.API_PORT) || 3000,
  HOST: process.env.API_HOST || '0.0.0.0',

  // ── Banco de dados ──
  DATABASE_URL: process.env.DATABASE_URL || './data/database/my-clippings.db',

  // ── JWT ──
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-to-a-random-secret',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',

  // ── Diretórios ──
  DATA_DIR: process.env.DATA_DIR || './data',
  USER_FILES_DIR: process.env.USER_FILES_DIR || './data/users',

  // ── Upload ──
  MAX_UPLOAD_SIZE: Number(process.env.MAX_UPLOAD_SIZE) || 52_428_800, // 50 MB

  // ── Rate limiting ──
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000, // 1 min

  // ── Logging ──
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // ── Ambiente ──
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── CORS ──
  WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:5173',
} as const;
