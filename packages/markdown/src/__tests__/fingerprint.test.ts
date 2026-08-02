import { describe, expect, it } from 'vitest';
import { computeFingerprint, normalizeContent } from '../fingerprint';

// Parâmetros base válidos para os testes
const BASE_PARAMS = {
  bookId: '01J3MYCLIPPINGS001',
  type: 'destaque',
  content: 'Conteúdo do destaque.',
  page: 10,
  locationStart: 135,
  locationEnd: 138,
  kindleDate: '2026-07-20T21:30:00-03:00',
};

describe('computeFingerprint', () => {
  // ── Determinismo ─────────────────────────────────────────────────────────

  it('deve produzir o mesmo fingerprint para a mesma entrada (determinístico)', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const second = computeFingerprint({ ...BASE_PARAMS });

    expect(first).toBe(second);
  });

  it('deve sempre incluir o prefixo "sha256:" seguido de 64 caracteres hexadecimais', () => {
    const fingerprint = computeFingerprint(BASE_PARAMS);

    expect(fingerprint.startsWith('sha256:')).toBe(true);
    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  // ── Sensibilidade a mudanças ─────────────────────────────────────────────

  it('deve produzir fingerprints diferentes para conteúdos diferentes', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const second = computeFingerprint({ ...BASE_PARAMS, content: 'Outro conteúdo.' });

    expect(first).not.toBe(second);
  });

  it('deve produzir fingerprints diferentes para bookIds diferentes', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const second = computeFingerprint({ ...BASE_PARAMS, bookId: '01J3MYCLIPPINGS999' });

    expect(first).not.toBe(second);
  });

  it('deve produzir fingerprints diferentes para datas diferentes', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const second = computeFingerprint({ ...BASE_PARAMS, kindleDate: '2026-07-21T18:45:00-03:00' });

    expect(first).not.toBe(second);
  });

  // ── Normalização de conteúdo ─────────────────────────────────────────────

  it('deve ignorar diferenças de espaços em branco (mesma fingerprint)', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const messy = computeFingerprint({
      ...BASE_PARAMS,
      content: '  Conteúdo   do\tdestaque.\n\n',
    });

    expect(first).toBe(messy);
  });

  it('deve ignorar caracteres de largura zero na normalização', () => {
    const first = computeFingerprint(BASE_PARAMS);
    const withZeroWidth = computeFingerprint({
      ...BASE_PARAMS,
      content: 'Conteúdo\u200B do\uFEFF destaque.\u200D',
    });

    expect(first).toBe(withZeroWidth);
  });

  it('deve normalizar Unicode para NFC (mesma fingerprint para formas distintas)', () => {
    // "é" composto (NFC) vs "e" + acento combinável (NFD)
    const nfc = computeFingerprint({ ...BASE_PARAMS, content: 'Atenção' });
    const nfd = computeFingerprint({ ...BASE_PARAMS, content: 'Atenção'.normalize('NFD') });

    expect(nfc).toBe(nfd);
  });

  // ── Campos nulos e ordem ─────────────────────────────────────────────────

  it('deve tratar página nula sem erro', () => {
    const fingerprint = computeFingerprint({ ...BASE_PARAMS, page: null });

    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('deve produzir fingerprints diferentes entre página nula e página presente', () => {
    const withPage = computeFingerprint(BASE_PARAMS);
    const withoutPage = computeFingerprint({ ...BASE_PARAMS, page: null });

    expect(withPage).not.toBe(withoutPage);
  });

  it('deve mudar o hash ao trocar a ordem dos campos (ordem importa)', () => {
    const normal = computeFingerprint(BASE_PARAMS);
    // Troca locationStart com locationEnd
    const swapped = computeFingerprint({
      ...BASE_PARAMS,
      locationStart: BASE_PARAMS.locationEnd,
      locationEnd: BASE_PARAMS.locationStart,
    });

    expect(normal).not.toBe(swapped);
  });
});

describe('normalizeContent', () => {
  it('deve remover espaços das extremidades', () => {
    expect(normalizeContent('  texto  ')).toBe('texto');
  });

  it('deve colapsar sequências de espaços em um único espaço', () => {
    expect(normalizeContent('a  b\tc\nd')).toBe('a b c d');
  });

  it('deve remover caracteres de largura zero', () => {
    expect(normalizeContent('a\u200Bb\u200Cc\u200Dd\uFEFFe')).toBe('abcde');
  });

  it('deve converter para normalização NFC', () => {
    const nfd = 'é'.normalize('NFD');
    expect(normalizeContent(nfd)).toBe('é');
  });

  it('deve retornar string vazia para conteúdo só com espaços', () => {
    expect(normalizeContent('   \n\t  ')).toBe('');
  });
});
