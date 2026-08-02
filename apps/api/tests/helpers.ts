import { createApp, type AppOptions } from '../src/app';
import { getDb, setDb } from '../src/lib/db';
import { createDatabase, type Database } from '@my-clippings/database';
import type { FastifyInstance } from 'fastify';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

/**
 * Cria uma instância de teste da API com:
 * - Banco SQLite em arquivo temporário
 * - Logger desabilitado
 * - Limpeza automática após o teste
 */
export async function createTestApp(overrides?: Partial<AppOptions>): Promise<{
  app: FastifyInstance;
  db: Database;
  cleanup: () => void;
}> {
  // Cria diretório temporário para dados
  const tmpDir = mkdtempSync(join(tmpdir(), 'my-clippings-test-'));
  const dbPath = join(tmpDir, 'test.db');
  const usersDir = join(tmpDir, 'users');

  // Configura variáveis de ambiente para o teste
  process.env.DATABASE_URL = dbPath;
  process.env.USER_FILES_DIR = usersDir;
  process.env.DATA_DIR = tmpDir;
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
  process.env.NODE_ENV = 'test';

  // Cria banco de teste
  const db = createDatabase(dbPath);
  setDb(db);

  // Aplica migrations executando cada statement do SQL
  const migrations = await importMigrationSQL();
  for (const stmt of migrations) {
    try {
      db.run(stmt as never);
    } catch {
      // Ignora "already exists"
    }
  }

  // Cria a app
  const app = await createApp({
    disableLogger: true,
    ...overrides,
  });

  await app.ready();

  const cleanup = () => {
    app.close();
    rmSync(tmpDir, { recursive: true, force: true });
  };

  return { app, db, cleanup };
}

/**
 * Carrega o SQL das migrations do pacote database.
 */
async function importMigrationSQL(): Promise<string[]> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { readdir } = await import('node:fs/promises');

  const migrationsDir = join(
    import.meta.dirname,
    '../../../packages/database/migrations',
  );

  const entries = await readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort();

  const allStatements: string[] = [];

  for (const file of sqlFiles) {
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    const statements = sql.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        allStatements.push(trimmed);
      }
    }
  }

  return allStatements;
}

/**
 * Registra um usuário de teste e retorna o token JWT.
 */
export async function registerAndLogin(
  app: FastifyInstance,
  overrides?: { name?: string; email?: string; password?: string },
): Promise<{ userId: string; token: string }> {
  const name = overrides?.name ?? 'Test User';
  const email = overrides?.email ?? 'test@example.com';
  const password = overrides?.password ?? 'password123';

  // Registra
  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name, email, password },
  });

  const registerBody = registerRes.json();
  const userId = registerBody.id;

  // Login
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });

  const cookies = loginRes.cookies;
  const token = cookies.find((c) => c.name === 'token')?.value ?? '';

  return { userId, token };
}
