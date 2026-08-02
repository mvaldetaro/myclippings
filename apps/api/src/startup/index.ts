import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import type { FastifyBaseLogger } from 'fastify';
import type { Database } from '@my-clippings/database';
import { rebuildIndex } from './rebuild-index';
import { cleanupTempFiles } from './cleanup-temp';

/**
 * Executa as migrations pendentes do banco de dados.
 *
 * Lê os arquivos SQL do diretório de migrations do pacote database
 * e executa cada um sequencialmente. Migrações já aplicadas são ignoradas
 * (drizzle-kit gera SQL idempotente, mas executamos via raw SQL aqui).
 */
async function runMigrations(log: FastifyBaseLogger, db: Database) {
  // Resolve o diretório de migrations a partir do pacote @my-clippings/database
  // (funciona em dev com workspace symlinks e em produção com node_modules físico)
  const require = createRequire(import.meta.url);
  const dbPkgJson = require.resolve('@my-clippings/database/package.json');
  const migrationsDir = join(dirname(dbPkgJson), 'migrations');

  try {
    const entries = await readdir(migrationsDir);
    const sqlFiles = entries
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Ordem alfabética garante sequência correta (0000_, 0001_, etc.)

    for (const file of sqlFiles) {
      // Read SQL file content
      const { readFile } = await import('node:fs/promises');
      const sql = await readFile(join(migrationsDir, file), 'utf-8');

      // Split by drizzle-kit statement breakpoints
      const statements = sql.split('--> statement-breakpoint');

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;

        try {
          // Executa cada statement individualmente
          db.run(trimmed as never);
        } catch (err) {
          // Ignora erros de "table already exists" — migração já aplicada
          const msg = String(err);
          if (!msg.includes('already exists')) {
            throw err;
          }
        }
      }
    }

    log.info({ count: sqlFiles.length }, 'Migrations aplicadas');
  } catch (err) {
    // Diretório pode não existir em produção (migrations são build-time)
    log.warn({ err }, 'Erro ao aplicar migrations');
  }
}

/**
 * Executa as tarefas de inicialização (ARCHITECTURE §8.4):
 *
 * 1. Aplica migrations pendentes
 * 2. Detecta arquivos `.tmp` abandonados (RNF-008)
 * 3. Reconstrói o file_index a partir dos Markdown (RNF-005)
 *
 * Cada etapa loga seu resultado e isola erros — uma falha em uma
 * não impede as demais.
 */
export async function runStartupTasks(log: FastifyBaseLogger, db: Database) {
  log.info('Executando tarefas de inicialização...');

  // 1. Migrations
  await runMigrations(log, db);

  // 2. Limpeza de arquivos temporários abandonados
  try {
    const cleaned = await cleanupTempFiles(log);
    if (cleaned > 0) {
      log.info({ count: cleaned }, 'Arquivos temporários removidos');
    }
  } catch (err) {
    log.error({ err }, 'Erro na limpeza de arquivos temporários');
  }

  // 3. Reconstrução do índice
  try {
    const result = await rebuildIndex(log, db);
    log.info(result, 'Índice reconstruído');
  } catch (err) {
    log.error({ err }, 'Erro na reconstrução do índice');
  }

  log.info('Tarefas de inicialização concluídas');
}
