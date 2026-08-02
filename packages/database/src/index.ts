import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * Cria uma instância do banco de dados SQLite conectada ao arquivo especificado.
 * Utiliza WAL mode para melhor performance de leitura concorrente.
 */
export function createDatabase(databaseUrl: string) {
  const sqlite = new Database(databaseUrl);

  // Habilita WAL mode para melhor concorrência
  sqlite.pragma('journal_mode = WAL');
  // Habilita foreign keys
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
export { schema };
