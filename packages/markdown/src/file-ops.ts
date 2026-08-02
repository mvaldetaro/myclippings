import { access, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Lê um arquivo Markdown e retorna seu conteúdo como string (UTF-8).
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

/**
 * Escreve um arquivo Markdown atomicamente (RNF-006).
 *
 * Processo: escreve em "{filePath}.tmp" no mesmo diretório, faz fsync e
 * renomeia sobre o destino (atômico no mesmo filesystem). Em qualquer erro,
 * o arquivo temporário é removido e o destino anterior permanece intacto.
 */
export async function writeMarkdownFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  let handle: FileHandle | null = null;

  try {
    handle = await open(tempPath, 'w');
    await handle.writeFile(content, 'utf-8');
    // Garante que os dados chegaram ao disco antes do rename
    await handle.sync();
    await handle.close();
    handle = null;

    await rename(tempPath, filePath);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => {});
    }
    // Limpa o temporário; ignora erro caso ele nem tenha sido criado
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

/**
 * Verifica se um arquivo Markdown existe.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Garante que o diretório para o arquivo existe (cria recursivamente se não).
 */
export async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
