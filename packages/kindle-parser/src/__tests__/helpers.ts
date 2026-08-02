import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Caminho base para fixtures de teste.
 * Resolve a partir do diretório do pacote parser.
 */
const FIXTURES_DIR = resolve(import.meta.dirname, '../../../../tests/fixtures');

/** Lê um arquivo de fixture como Buffer */
export function readFixture(filename: string): Buffer {
  return readFileSync(resolve(FIXTURES_DIR, filename));
}

/** Lê um arquivo de fixture como string UTF-8 */
export function readFixtureText(filename: string): string {
  return readFileSync(resolve(FIXTURES_DIR, filename), 'utf-8');
}

/**
 * Cria um arquivo temporário para teste e retorna o caminho.
 * ATENÇÃO: o chamador é responsável por limpar o arquivo.
 */
export function createTempFile(content: string | Buffer, extension = '.txt'): string {
  const tmpDir = resolve(import.meta.dirname, '../../node_modules/.tmp');
  mkdirSync(tmpDir, { recursive: true });

  const filepath = resolve(
    tmpDir,
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
  );
  writeFileSync(filepath, content);
  return filepath;
}
