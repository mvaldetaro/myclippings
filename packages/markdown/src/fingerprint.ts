import { createHash } from 'node:crypto';

/** Parâmetros para o cálculo do fingerprint de um clipping */
interface FingerprintParams {
  bookId: string;
  type: string;
  content: string;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string;
}

// Caracteres de largura zero que não devem afetar a comparação de conteúdo
// (ZWSP U+200B, ZWNJ U+200C, ZWJ U+200D, BOM U+FEFF)
// biome-ignore lint/suspicious/noMisleadingCharacterClass: a intencao e casar exatamente esses code points invisiveis
const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\uFEFF]/g;

// Qualquer sequência de espaços em branco (espaços, tabs, quebras de linha)
const WHITESPACE_RE = /\s+/g;

/**
 * Normaliza o conteúdo de um clipping para comparação de fingerprints.
 *
 * Regras (RN-001):
 * - Remove espaços das extremidades
 * - Colapsa sequências de espaços em branco em um único espaço
 * - Remove caracteres de largura zero (ZWSP, ZWNJ, ZWJ, BOM)
 * - Converte para normalização Unicode NFC
 */
export function normalizeContent(content: string): string {
  return (
    content
      .trim()
      // Zero-width primeiro: \uFEFF casa com \s e viraria espaço na etapa seguinte
      .replace(ZERO_WIDTH_RE, '')
      .replace(WHITESPACE_RE, ' ')
      .normalize('NFC')
  );
}

/**
 * Calcula o fingerprint SHA-256 de um clipping (RN-001).
 *
 * A entrada do hash é a concatenação dos campos separados por "|",
 * nesta ordem exata (a ordem é relevante):
 * bookId|type|normalizedContent|page|locationStart|locationEnd|kindleDate
 *
 * Página nula é serializada como string vazia.
 *
 * @returns Fingerprint no formato "sha256:<hash-hex>"
 */
export function computeFingerprint(params: FingerprintParams): string {
  const input = [
    params.bookId,
    params.type,
    normalizeContent(params.content),
    params.page === null ? '' : String(params.page),
    String(params.locationStart),
    String(params.locationEnd),
    params.kindleDate,
  ].join('|');

  const hash = createHash('sha256').update(input, 'utf8').digest('hex');
  return `sha256:${hash}`;
}
