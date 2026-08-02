import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Clipping, ClippingSummary, ClippingType, RawClipping } from '../clipping';

describe('ClippingType', () => {
  it('deve aceitar os três tipos de clipping do Kindle', () => {
    // Atribuição a variável tipada garante em tempo de compilação que a união aceita os valores
    const types: ClippingType[] = ['destaque', 'nota', 'marcador'];

    expect(types).toHaveLength(3);
    expect(types).toContain('destaque');
    expect(types).toContain('nota');
    expect(types).toContain('marcador');
  });

  it('ClippingType deve ser exatamente a união esperada', () => {
    expectTypeOf<ClippingType>().toEqualTypeOf<'destaque' | 'nota' | 'marcador'>();
  });
});

describe('tipo Clipping', () => {
  it('deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<Clipping['id']>().toEqualTypeOf<string>();
    expectTypeOf<Clipping['bookId']>().toEqualTypeOf<string>();
    expectTypeOf<Clipping['type']>().toEqualTypeOf<ClippingType>();
    expectTypeOf<Clipping['content']>().toEqualTypeOf<string>();
    expectTypeOf<Clipping['page']>().toEqualTypeOf<number | null>();
    expectTypeOf<Clipping['locationStart']>().toEqualTypeOf<number>();
    expectTypeOf<Clipping['locationEnd']>().toEqualTypeOf<number>();
    expectTypeOf<Clipping['kindleDate']>().toEqualTypeOf<string>();
    expectTypeOf<Clipping['createdAt']>().toEqualTypeOf<string>();
  });

  it('deve ser possível construir um Clipping válido', () => {
    const clipping: Clipping = {
      id: 'fingerprint-sha256',
      bookId: '01J00000000000000000000000',
      type: 'destaque',
      content: 'Conteúdo do destaque',
      page: 42,
      locationStart: 100,
      locationEnd: 105,
      kindleDate: '2026-07-25T10:00:00.000Z',
      createdAt: '2026-07-25T12:00:00.000Z',
    };

    expect(clipping.type).toBe('destaque');
    expect(clipping.page).toBe(42);
  });

  it('page deve aceitar null', () => {
    const clipping: Clipping = {
      id: 'fingerprint-sha256',
      bookId: '01J00000000000000000000000',
      type: 'nota',
      content: 'Nota sem página',
      page: null,
      locationStart: 100,
      locationEnd: 105,
      kindleDate: '2026-07-25T10:00:00.000Z',
      createdAt: '2026-07-25T12:00:00.000Z',
    };

    expect(clipping.page).toBeNull();
  });
});

describe('tipo RawClipping', () => {
  it('não deve ter id, bookId nem createdAt', () => {
    expectTypeOf<RawClipping>().not.toHaveProperty('id');
    expectTypeOf<RawClipping>().not.toHaveProperty('bookId');
    expectTypeOf<RawClipping>().not.toHaveProperty('createdAt');
  });

  it('deve ter title obrigatório e author opcional', () => {
    expectTypeOf<RawClipping['title']>().toEqualTypeOf<string>();
    expectTypeOf<RawClipping['author']>().toEqualTypeOf<string | undefined>();
  });

  it('deve manter os campos de conteúdo do clipping', () => {
    expectTypeOf<RawClipping['type']>().toEqualTypeOf<ClippingType>();
    expectTypeOf<RawClipping['content']>().toEqualTypeOf<string>();
    expectTypeOf<RawClipping['page']>().toEqualTypeOf<number | null>();
    expectTypeOf<RawClipping['locationStart']>().toEqualTypeOf<number>();
    expectTypeOf<RawClipping['locationEnd']>().toEqualTypeOf<number>();
    expectTypeOf<RawClipping['kindleDate']>().toEqualTypeOf<string>();
  });

  it('deve ser possível construir um RawClipping sem author', () => {
    const raw: RawClipping = {
      title: 'Duna',
      type: 'destaque',
      content: 'Conteúdo',
      page: null,
      locationStart: 1,
      locationEnd: 2,
      kindleDate: '2026-07-25T10:00:00.000Z',
    };

    expect(raw.title).toBe('Duna');
    expect(raw.author).toBeUndefined();
  });
});

describe('tipo ClippingSummary', () => {
  it('deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<ClippingSummary['id']>().toEqualTypeOf<string>();
    expectTypeOf<ClippingSummary['type']>().toEqualTypeOf<ClippingType>();
    expectTypeOf<ClippingSummary['contentPreview']>().toEqualTypeOf<string>();
    expectTypeOf<ClippingSummary['page']>().toEqualTypeOf<number | null>();
    expectTypeOf<ClippingSummary['kindleDate']>().toEqualTypeOf<string>();
  });

  it('deve aceitar um preview de até 150 caracteres', () => {
    const summary: ClippingSummary = {
      id: 'fingerprint-sha256',
      type: 'destaque',
      contentPreview: 'a'.repeat(150),
      page: 10,
      kindleDate: '2026-07-25T10:00:00.000Z',
    };

    expect(summary.contentPreview).toHaveLength(150);
  });
});
