import { describe, expect, it } from 'vitest';
import { serializeBook } from '../serializer';

// Parâmetros base de um livro para os testes
const BASE_BOOK = {
  bookId: '01J3MYCLIPPINGS001',
  title: 'Nome do livro',
  author: 'Nome do autor',
  createdAt: '2026-07-25T10:00:00-03:00',
  updatedAt: '2026-07-25T10:30:00-03:00',
};

const BASE_CLIPPING = {
  id: 'sha256:a12b34c56d',
  type: 'destaque' as const,
  content: 'Conteúdo do destaque.',
  page: 10,
  locationStart: 135,
  locationEnd: 138,
  kindleDate: '2026-07-20T21:30:00-03:00',
};

describe('serializeBook', () => {
  // ── Livro vazio ──────────────────────────────────────────────────────────

  it('deve serializar livro sem clippings com clippingCount 0 e seção vazia', () => {
    const result = serializeBook({ ...BASE_BOOK, clippings: [] });

    expect(result.clippingCount).toBe(0);
    expect(result.content).toBe(
      `---
schemaVersion: 1
bookId: "01J3MYCLIPPINGS001"
title: "Nome do livro"
author: "Nome do autor"
createdAt: "2026-07-25T10:00:00-03:00"
updatedAt: "2026-07-25T10:30:00-03:00"
clippingCount: 0
---

# Nome do livro

**Autor:** Nome do autor

## Clippings
`,
    );
  });

  // ── Clipping único ───────────────────────────────────────────────────────

  it('deve serializar um clipping único no formato exato do SPEC', () => {
    const result = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });

    expect(result.clippingCount).toBe(1);
    expect(result.content).toBe(
      `---
schemaVersion: 1
bookId: "01J3MYCLIPPINGS001"
title: "Nome do livro"
author: "Nome do autor"
createdAt: "2026-07-25T10:00:00-03:00"
updatedAt: "2026-07-25T10:30:00-03:00"
clippingCount: 1
---

# Nome do livro

**Autor:** Nome do autor

## Clippings

### Destaque

<!-- clipping-id: sha256:a12b34c56d -->

> Conteúdo do destaque.

- Tipo: destaque
- Página: 10
- Localização: 135-138
- Data do Kindle: 2026-07-20T21:30:00-03:00
`,
    );
  });

  // ── Múltiplos clippings ──────────────────────────────────────────────────

  it('deve ordenar clippings por kindleDate ascendente e separar com ---', () => {
    const newer = {
      ...BASE_CLIPPING,
      id: 'sha256:e78f90a12b',
      type: 'nota' as const,
      content: 'Conteúdo da nota.',
      page: 15,
      locationStart: 200,
      locationEnd: 200,
      kindleDate: '2026-07-21T18:45:00-03:00',
    };

    // Passa o mais novo primeiro: a saída deve ordenar do mais antigo ao mais novo
    const result = serializeBook({ ...BASE_BOOK, clippings: [newer, BASE_CLIPPING] });

    expect(result.clippingCount).toBe(2);
    expect(result.content).toBe(
      `---
schemaVersion: 1
bookId: "01J3MYCLIPPINGS001"
title: "Nome do livro"
author: "Nome do autor"
createdAt: "2026-07-25T10:00:00-03:00"
updatedAt: "2026-07-25T10:30:00-03:00"
clippingCount: 2
---

# Nome do livro

**Autor:** Nome do autor

## Clippings

### Destaque

<!-- clipping-id: sha256:a12b34c56d -->

> Conteúdo do destaque.

- Tipo: destaque
- Página: 10
- Localização: 135-138
- Data do Kindle: 2026-07-20T21:30:00-03:00

---

### Nota

<!-- clipping-id: sha256:e78f90a12b -->

> Conteúdo da nota.

- Tipo: nota
- Página: 15
- Localização: 200
- Data do Kindle: 2026-07-21T18:45:00-03:00
`,
    );
  });

  // ── Variações de campos ──────────────────────────────────────────────────

  it('deve omitir a linha de página quando page é null', () => {
    const result = serializeBook({
      ...BASE_BOOK,
      clippings: [{ ...BASE_CLIPPING, page: null }],
    });

    expect(result.content).not.toContain('- Página:');
    expect(result.content).toContain('- Localização: 135-138');
  });

  it('deve exibir localização única quando locationStart === locationEnd', () => {
    const result = serializeBook({
      ...BASE_BOOK,
      clippings: [{ ...BASE_CLIPPING, locationStart: 200, locationEnd: 200 }],
    });

    expect(result.content).toContain('- Localização: 200\n');
    expect(result.content).not.toContain('- Localização: 200-200');
  });

  it('deve capitalizar os tipos nos títulos (Destaque, Nota, Marcador)', () => {
    const clippings = [
      { ...BASE_CLIPPING, id: 'sha256:1', type: 'destaque' as const },
      { ...BASE_CLIPPING, id: 'sha256:2', type: 'nota' as const },
      { ...BASE_CLIPPING, id: 'sha256:3', type: 'marcador' as const },
    ];
    const result = serializeBook({ ...BASE_BOOK, clippings });

    expect(result.content).toContain('### Destaque');
    expect(result.content).toContain('### Nota');
    expect(result.content).toContain('### Marcador');
    // Valor do tipo no metadado permanece em minúsculas
    expect(result.content).toContain('- Tipo: marcador');
  });

  // ── Conteúdo ─────────────────────────────────────────────────────────────

  it('deve prefixar todas as linhas do conteúdo com "> " e linhas vazias com ">"', () => {
    const result = serializeBook({
      ...BASE_BOOK,
      clippings: [{ ...BASE_CLIPPING, content: 'Linha um.\n\nLinha três.' }],
    });

    expect(result.content).toContain('> Linha um.\n>\n> Linha três.');
  });

  it('deve preservar caracteres especiais do conteúdo', () => {
    const special = 'Aspas "duplas", acentos çãõé, e símbolos <>&*';
    const result = serializeBook({
      ...BASE_BOOK,
      clippings: [{ ...BASE_CLIPPING, content: special }],
    });

    expect(result.content).toContain(`> ${special}`);
  });

  // ── Determinismo ─────────────────────────────────────────────────────────

  it('deve produzir saída byte a byte idêntica para a mesma entrada', () => {
    const input = { ...BASE_BOOK, clippings: [BASE_CLIPPING] };
    const first = serializeBook(input);
    const second = serializeBook({ ...input, clippings: [{ ...BASE_CLIPPING }] });

    expect(first.content).toBe(second.content);
  });

  it('deve terminar o arquivo com uma quebra de linha', () => {
    const result = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });

    expect(result.content.endsWith('\n')).toBe(true);
    expect(result.content.endsWith('\n\n')).toBe(false);
  });

  // ── schemaVersion ────────────────────────────────────────────────────────

  it('deve usar schemaVersion 1 por padrão', () => {
    const result = serializeBook({ ...BASE_BOOK, clippings: [] });

    expect(result.content).toContain('schemaVersion: 1\n');
  });
});
