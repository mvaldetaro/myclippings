import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBookPath, isWithinBase, sanitizePath, slugify } from '../path-utils';

describe('slugify', () => {
  it('deve converter texto simples para slug em minúsculas', () => {
    expect(slugify('O Poder do Hábito')).toBe('o-poder-do-habito');
  });

  it('deve substituir caracteres especiais por hífens', () => {
    expect(slugify('Sapiens: Uma Breve História da Humanidade!')).toBe(
      'sapiens-uma-breve-historia-da-humanidade',
    );
  });

  it('deve colapsar múltiplos hífens consecutivos', () => {
    expect(slugify('a---b   c')).toBe('a-b-c');
  });

  it('deve remover hífens das extremidades', () => {
    expect(slugify('--texto--')).toBe('texto');
    expect(slugify('!texto!')).toBe('texto');
  });

  it('deve limitar o slug a 100 caracteres', () => {
    const long = 'palavra '.repeat(50);
    const slug = slugify(long);

    expect(slug.length).toBeLessThanOrEqual(100);
    // Não deve terminar com hífen solto após o corte
    expect(slug.endsWith('-')).toBe(false);
  });

  it('deve retornar string vazia para entrada sem caracteres alfanuméricos', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('sanitizePath', () => {
  // ── Rejeições ────────────────────────────────────────────────────────────

  it('deve rejeitar path traversal com "../"', () => {
    expect(() => sanitizePath('../etc/passwd')).toThrow();
    expect(() => sanitizePath('foo/../../bar')).toThrow();
  });

  it('deve rejeitar segmento "." e ".." isolados', () => {
    expect(() => sanitizePath('..')).toThrow();
    expect(() => sanitizePath('.')).toThrow();
  });

  it('deve rejeitar "./"', () => {
    expect(() => sanitizePath('./arquivo')).toThrow();
  });

  it('deve rejeitar null bytes', () => {
    expect(() => sanitizePath('arquivo\0.txt')).toThrow();
  });

  it('deve rejeitar caracteres de controle', () => {
    expect(() => sanitizePath('arquivo\tname')).toThrow();
    expect(() => sanitizePath('arquivo\nname')).toThrow();
    expect(() => sanitizePath('arquivo\x7Fname')).toThrow();
  });

  it('deve rejeitar nomes reservados do Windows', () => {
    expect(() => sanitizePath('CON')).toThrow();
    expect(() => sanitizePath('con')).toThrow();
    expect(() => sanitizePath('PRN')).toThrow();
    expect(() => sanitizePath('AUX')).toThrow();
    expect(() => sanitizePath('NUL')).toThrow();
    expect(() => sanitizePath('COM1')).toThrow();
    expect(() => sanitizePath('COM9')).toThrow();
    expect(() => sanitizePath('LPT1')).toThrow();
    expect(() => sanitizePath('LPT9')).toThrow();
    // Reservado mesmo com extensão
    expect(() => sanitizePath('CON.txt')).toThrow();
  });

  it('deve rejeitar segmento vazio', () => {
    expect(() => sanitizePath('')).toThrow();
  });

  // ── Aceitações ───────────────────────────────────────────────────────────

  it('deve aceitar nomes normais com hífens, underscores e pontos', () => {
    expect(sanitizePath('meu-livro_final.md')).toBe('meu-livro_final.md');
    expect(sanitizePath('01J3MYCLIPPINGS001')).toBe('01J3MYCLIPPINGS001');
    expect(sanitizePath('o-poder-do-habito')).toBe('o-poder-do-habito');
  });

  it('deve aceitar nomes com dois pontos consecutivos no meio (não é traversal)', () => {
    expect(sanitizePath('foo..bar')).toBe('foo..bar');
  });
});

describe('buildBookPath', () => {
  const params = {
    baseDir: '/data',
    userId: 'user123',
    author: 'Álex Rovira Celma',
    title: 'A boa sorte',
    bookId: '01J3MYCLIPPINGS001',
  };

  it('deve gerar a estrutura de caminho correta (SPEC §6)', () => {
    const result = buildBookPath(params);

    expect(result.directory).toBe(
      join(
        '/data',
        'users',
        'user123',
        'books',
        'alex-rovira-celma',
        'a-boa-sorte-01J3MYCLIPPINGS001',
      ),
    );
    expect(result.filePath).toBe(join(result.directory, 'clippings.md'));
  });

  it('deve gerar relativePath correto em relação ao baseDir', () => {
    const result = buildBookPath(params);

    expect(result.relativePath).toBe(
      join(
        'users',
        'user123',
        'books',
        'alex-rovira-celma',
        'a-boa-sorte-01J3MYCLIPPINGS001',
        'clippings.md',
      ),
    );
    expect(join(params.baseDir, result.relativePath)).toBe(result.filePath);
  });

  it('deve rejeitar userId com path traversal', () => {
    expect(() => buildBookPath({ ...params, userId: '../evil' })).toThrow();
  });

  it('deve rejeitar bookId com path traversal', () => {
    expect(() => buildBookPath({ ...params, bookId: '../../evil' })).toThrow();
  });

  it('deve garantir que o caminho final está dentro do baseDir', () => {
    const result = buildBookPath(params);

    expect(isWithinBase(result.filePath, params.baseDir)).toBe(true);
  });
});

describe('isWithinBase', () => {
  it('deve permitir caminhos dentro do diretório base', () => {
    expect(isWithinBase('/data/users/u1/books/x/clippings.md', '/data')).toBe(true);
  });

  it('deve detectar path traversal fora do diretório base', () => {
    expect(isWithinBase('/data/../etc/passwd', '/data')).toBe(false);
    expect(isWithinBase('/etc/passwd', '/data')).toBe(false);
  });

  it('deve rejeitar prefixos parecidos que não são o diretório base', () => {
    // "/data-other" começa com "/data" mas não está dentro dele
    expect(isWithinBase('/data-other/file.md', '/data')).toBe(false);
  });

  it('deve aceitar caminho relativo resolvido contra o baseDir', () => {
    const base = resolve('/data');
    expect(isWithinBase('users/u1/clippings.md', base)).toBe(true);
  });
});
