import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../config/env';

/**
 * Detecta e remove arquivos `.tmp` abandonados no diretório de dados (RNF-008).
 *
 * Arquivos `.tmp` são resíduos de escritas atômicas que foram interrompidas.
 * Após um crash, esses arquivos não representam dados válidos e devem ser
 * removidos para evitar confusão durante a inicialização.
 *
 * @returns Número de arquivos removidos
 */
export async function cleanupTempFiles(log: FastifyBaseLogger): Promise<number> {
  const baseDir = env.USER_FILES_DIR;
  let cleaned = 0;

  async function walk(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith('.tmp')) {
          try {
            await unlink(fullPath);
            cleaned++;
            log.debug({ file: fullPath }, 'Arquivo temporário removido');
          } catch (err) {
            log.warn({ err, file: fullPath }, 'Falha ao remover arquivo temporário');
          }
        }
      }
    } catch {
      // Diretório pode não existir ainda (primeira execução)
      log.debug({ dir }, 'Diretório não encontrado durante cleanup');
    }
  }

  await walk(baseDir);
  return cleaned;
}
