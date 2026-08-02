import { createDatabase } from '@my-clippings/database';
import type { Database } from '@my-clippings/database';
import { env } from '../config/env';

let _db: Database | undefined;

/**
 * Retorna a instância singleton do banco de dados.
 * Cria na primeira chamada.
 */
export function getDb(): Database {
  if (!_db) {
    _db = createDatabase(env.DATABASE_URL);
  }
  return _db;
}

/**
 * Substitui a instância do banco (útil em testes).
 */
export function setDb(db: Database): void {
  _db = db;
}

/**
 * Fecha a conexão com o banco de dados.
 */
export function closeDb(): void {
  // better-sqlite3 não expõe close diretamente via drizzle.
  // O banco fecha automaticamente quando o processo termina.
  _db = undefined;
}
