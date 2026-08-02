import { describe, expect, it } from 'vitest';
import { deserializeBook, readFrontMatter } from '../deserializer';
import { serializeBook } from '../serializer';

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

describe('deserializeBook', () => {
  // ── Round-trip ───────────────────────────────────────────────────────────

  it('deve fazer round-trip: serializar e deserializar preserva os dados', () => {
    const clippings = [
      BASE_CLIPPING,
      {
        id: 'sha256:e78f90a12b',
        type: 'nota' as const,
        content: 'Nota com\nmúltiplas\n\nlinhas.',
        page: null,
        locationStart: 200,
        locationEnd: 200,
        kindleDate: '2026-07-21T18:45:00-03:00',
      },
      {
        id: 'sha256:99ff00cc11',
        type: 'marcador' as const,
        content: '',
        page: null,
        locationStart: 300,
        locationEnd: 300,
        kindleDate: '2026-07-22T08:00:00-03:00',
      },
    ];

    const serialized = serializeBook({ ...BASE_BOOK, clippings });
    const result = deserializeBook(serialized.content);

    expect(result.frontMatter).toEqual({
      schemaVersion: 1,
      bookId: BASE_BOOK.bookId,
      title: BASE_BOOK.title,
      author: BASE_BOOK.author,
      createdAt: BASE_BOOK.createdAt,
      updatedAt: BASE_BOOK.updatedAt,
      clippingCount: 3,
    });
    expect(result.clippings).toHaveLength(3);
    expect(result.clippings[0]).toEqual(BASE_CLIPPING);
    expect(result.clippings[1]).toEqual(clippings[1]);
    expect(result.clippings[2]).toEqual(clippings[2]);
  });

  // ── Livro vazio ──────────────────────────────────────────────────────────

  it('deve parsear livro sem clippings', () => {
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [] });
    const result = deserializeBook(serialized.content);

    expect(result.frontMatter.clippingCount).toBe(0);
    expect(result.clippings).toEqual([]);
  });

  // ── Clipping único ───────────────────────────────────────────────────────

  it('deve parsear um clipping único com todos os campos', () => {
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });
    const result = deserializeBook(serialized.content);

    const clipping = result.clippings[0];
    expect(clipping).toBeDefined();
    expect(clipping!.id).toBe('sha256:a12b34c56d');
    expect(clipping!.type).toBe('destaque');
    expect(clipping!.content).toBe('Conteúdo do destaque.');
    expect(clipping!.page).toBe(10);
    expect(clipping!.locationStart).toBe(135);
    expect(clipping!.locationEnd).toBe(138);
    expect(clipping!.kindleDate).toBe('2026-07-20T21:30:00-03:00');
  });

  // ── Múltiplos clippings ──────────────────────────────────────────────────

  it('deve parsear a quantidade correta de múltiplos clippings', () => {
    const clippings = [
      BASE_CLIPPING,
      { ...BASE_CLIPPING, id: 'sha256:2', kindleDate: '2026-07-21T18:45:00-03:00' },
      { ...BASE_CLIPPING, id: 'sha256:3', kindleDate: '2026-07-22T10:00:00-03:00' },
    ];
    const serialized = serializeBook({ ...BASE_BOOK, clippings });
    const result = deserializeBook(serialized.content);

    expect(result.clippings).toHaveLength(3);
    expect(result.clippings.map((c) => c.id)).toEqual([
      'sha256:a12b34c56d',
      'sha256:2',
      'sha256:3',
    ]);
  });

  // ── Campos opcionais ausentes ────────────────────────────────────────────

  it('deve usar page=null quando a linha de página está ausente', () => {
    const serialized = serializeBook({
      ...BASE_BOOK,
      clippings: [{ ...BASE_CLIPPING, page: null }],
    });
    const result = deserializeBook(serialized.content);

    expect(result.clippings[0]!.page).toBeNull();
  });

  it('deve usar localização 1-1 quando a linha de localização está ausente', () => {
    // Remove manualmente a linha de localização de um Markdown serializado
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });
    const withoutLocation = serialized.content.replace('- Localização: 135-138\n', '');
    const result = deserializeBook(withoutLocation);

    expect(result.clippings[0]!.locationStart).toBe(1);
    expect(result.clippings[0]!.locationEnd).toBe(1);
  });

  // ── Erros ────────────────────────────────────────────────────────────────

  it('deve lançar erro descritivo para YAML inválido no front matter', () => {
    const invalid = '---\nbookId: [não fechado\n---\n\n# Título\n';

    expect(() => deserializeBook(invalid)).toThrow(/front matter|YAML/i);
  });

  it('deve lançar erro quando o front matter está ausente', () => {
    expect(() => deserializeBook('# Apenas um título\n')).toThrow(/front matter/i);
  });

  it('deve lançar erro para schemaVersion desconhecida', () => {
    const serialized = serializeBook({ ...BASE_BOOK, schemaVersion: 99, clippings: [] });

    expect(() => deserializeBook(serialized.content)).toThrow(/schemaVersion|versão/i);
  });

  it('deve lançar erro para clipping sem tipo reconhecido', () => {
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });
    const malformed = serialized.content.replace('### Destaque', '### Desconhecido');

    expect(() => deserializeBook(malformed)).toThrow(/tipo/i);
  });

  it('deve lançar erro para clipping sem o comentário de id', () => {
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });
    const withoutId = serialized.content.replace('<!-- clipping-id: sha256:a12b34c56d -->\n\n', '');

    expect(() => deserializeBook(withoutId)).toThrow(/id/i);
  });
});

describe('readFrontMatter', () => {
  it('deve retornar apenas os metadados sem processar clippings', () => {
    const serialized = serializeBook({ ...BASE_BOOK, clippings: [BASE_CLIPPING] });
    const frontMatter = readFrontMatter(serialized.content);

    expect(frontMatter).toEqual({
      schemaVersion: 1,
      bookId: BASE_BOOK.bookId,
      title: BASE_BOOK.title,
      author: BASE_BOOK.author,
      createdAt: BASE_BOOK.createdAt,
      updatedAt: BASE_BOOK.updatedAt,
      clippingCount: 1,
    });
  });

  it('deve lançar erro para schemaVersion desconhecida', () => {
    const serialized = serializeBook({ ...BASE_BOOK, schemaVersion: 2, clippings: [] });

    expect(() => readFrontMatter(serialized.content)).toThrow(/schemaVersion|versão/i);
  });
});
