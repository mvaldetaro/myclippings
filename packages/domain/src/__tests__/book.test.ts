import { describe, expect, expectTypeOf, it } from 'vitest';
import { createBookIdentity, normalizeBookIdentity } from '../book';
import type { Book, BookIdentity, CreateBookInput } from '../book';

describe('createBookIdentity', () => {
  it('deve remover espaços das extremidades do título e do autor', () => {
    const identity = createBookIdentity('  Duna  ', '  Frank Herbert  ');

    expect(identity).toEqual({ title: 'Duna', author: 'Frank Herbert' });
  });

  it('deve preservar o conteúdo interno sem alterações', () => {
    const identity = createBookIdentity('O Poder do Hábito', 'Charles Duhigg');

    expect(identity).toEqual({ title: 'O Poder do Hábito', author: 'Charles Duhigg' });
  });

  it('deve retornar um objeto com a forma de BookIdentity', () => {
    const identity = createBookIdentity('Duna', 'Frank Herbert');

    expectTypeOf(identity).toEqualTypeOf<BookIdentity>();
  });
});

describe('normalizeBookIdentity', () => {
  it('deve remover espaços das extremidades', () => {
    const normalized = normalizeBookIdentity({ title: '  Duna  ', author: '  Frank Herbert  ' });

    expect(normalized).toEqual({ title: 'Duna', author: 'Frank Herbert' });
  });

  it('deve colapsar espaços internos múltiplos em um único espaço', () => {
    const normalized = normalizeBookIdentity({
      title: 'O   Poder  do   Hábito',
      author: 'Charles    Duhigg',
    });

    expect(normalized).toEqual({ title: 'O Poder do Hábito', author: 'Charles Duhigg' });
  });

  it('deve preservar a caixa original (sem converter para minúsculas)', () => {
    const normalized = normalizeBookIdentity({ title: 'DUNA', author: 'FRANK HERBERT' });

    expect(normalized).toEqual({ title: 'DUNA', author: 'FRANK HERBERT' });
  });

  it('deve permitir comparação case-insensitive sobre o resultado normalizado', () => {
    const a = normalizeBookIdentity({ title: '  Duna ', author: 'Frank  Herbert' });
    const b = normalizeBookIdentity({ title: 'DUNA', author: 'frank herbert' });

    // A normalização prepara as strings para comparação: a caixa é responsabilidade do consumidor
    expect(a.title.toLowerCase()).toBe(b.title.toLowerCase());
    expect(a.author.toLowerCase()).toBe(b.author.toLowerCase());
  });

  it('deve retornar um objeto com a forma de BookIdentity', () => {
    const normalized = normalizeBookIdentity({ title: 'Duna', author: 'Frank Herbert' });

    expectTypeOf(normalized).toEqualTypeOf<BookIdentity>();
  });
});

describe('tipos de Book', () => {
  it('Book deve ter os campos esperados com os tipos esperados', () => {
    expectTypeOf<Book['id']>().toEqualTypeOf<string>();
    expectTypeOf<Book['title']>().toEqualTypeOf<string>();
    expectTypeOf<Book['author']>().toEqualTypeOf<string>();
    expectTypeOf<Book['titleSlug']>().toEqualTypeOf<string>();
    expectTypeOf<Book['authorSlug']>().toEqualTypeOf<string>();
    expectTypeOf<Book['clippingCount']>().toEqualTypeOf<number>();
    expectTypeOf<Book['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<Book['updatedAt']>().toEqualTypeOf<string>();
    expectTypeOf<Book['schemaVersion']>().toEqualTypeOf<number>();
  });

  it('BookIdentity deve ter apenas title e author', () => {
    expectTypeOf<BookIdentity>().toEqualTypeOf<{ title: string; author: string }>();
  });

  it('CreateBookInput deve ter apenas title e author', () => {
    expectTypeOf<CreateBookInput>().toEqualTypeOf<{ title: string; author: string }>();
  });
});
