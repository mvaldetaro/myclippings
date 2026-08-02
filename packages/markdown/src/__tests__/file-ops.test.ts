import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureDirectory, fileExists, readMarkdownFile, writeMarkdownFile } from '../file-ops';

describe('file-ops', () => {
  // Diretório temporário isolado por execução de teste
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'markdown-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  // ── Escrita e leitura ────────────────────────────────────────────────────

  it('deve escrever e ler de volta com conteúdo idêntico', async () => {
    const filePath = join(testDir, 'clippings.md');
    const content = '# Título\n\n> Conteúdo com acentuação çãõé\n';

    await writeMarkdownFile(filePath, content);
    const read = await readMarkdownFile(filePath);

    expect(read).toBe(content);
  });

  it('deve sobrescrever um arquivo existente', async () => {
    const filePath = join(testDir, 'clippings.md');

    await writeMarkdownFile(filePath, 'versão antiga');
    await writeMarkdownFile(filePath, 'versão nova');

    expect(await readMarkdownFile(filePath)).toBe('versão nova');
  });

  // ── Escrita atômica (RNF-006) ────────────────────────────────────────────

  it('deve remover o arquivo temporário após escrita bem-sucedida', async () => {
    const filePath = join(testDir, 'clippings.md');

    await writeMarkdownFile(filePath, 'conteúdo');

    const files = await readdir(testDir);
    expect(files).toEqual(['clippings.md']);
    expect(files).not.toContain('clippings.md.tmp');
  });

  // ── Existência ───────────────────────────────────────────────────────────

  it('deve retornar true para arquivo existente e false para inexistente', async () => {
    const filePath = join(testDir, 'clippings.md');

    expect(await fileExists(filePath)).toBe(false);

    await writeMarkdownFile(filePath, 'conteúdo');

    expect(await fileExists(filePath)).toBe(true);
  });

  // ── Diretórios ───────────────────────────────────────────────────────────

  it('deve criar diretórios aninhados para o arquivo', async () => {
    const filePath = join(testDir, 'users', 'u1', 'books', 'autor', 'titulo-id', 'clippings.md');

    await ensureDirectory(filePath);
    await writeMarkdownFile(filePath, 'conteúdo');

    expect(await fileExists(filePath)).toBe(true);
  });

  it('deve ser idempotente ao garantir diretório já existente', async () => {
    const filePath = join(testDir, 'livro', 'clippings.md');

    await ensureDirectory(filePath);
    await ensureDirectory(filePath);

    await writeMarkdownFile(filePath, 'conteúdo');
    expect(await readMarkdownFile(filePath)).toBe('conteúdo');
  });
});
