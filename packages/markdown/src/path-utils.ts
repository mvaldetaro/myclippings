import { join, resolve, sep } from 'node:path';

/** Parâmetros para a construção do caminho de um livro */
interface BuildBookPathParams {
  baseDir: string;
  userId: string;
  author: string;
  title: string;
  bookId: string;
}

/** Caminhos gerados para o arquivo Markdown de um livro */
interface BookPath {
  /** Diretório absoluto do livro (pasta que contém clippings.md) */
  directory: string;
  /** Caminho absoluto do arquivo clippings.md */
  filePath: string;
  /** Caminho relativo ao baseDir (persistido no file_index) */
  relativePath: string;
}

// Diacríticos combináveis Unicode (acentos) removidos na geração de slugs
// biome-ignore lint/suspicious/noMisleadingCharacterClass: a intencao e casar as marcas combinaveis para remove-las
const DIACRITICS_RE = /[\u0300-\u036F]/g;

// Caracteres que não são letras nem números viram hífen no slug
const NON_ALPHANUMERIC_RE = /[^a-z0-9]+/g;

// Nomes reservados do Windows, com ou sem extensão (ex: "CON", "CON.txt")
const WINDOWS_RESERVED_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

// Null bytes e caracteres de controle (0x00-0x1F, 0x7F) são proibidos em caminhos
// eslint-disable-next-line no-control-regex -- a intenção é justamente detectar controles
// biome-ignore lint/suspicious/noControlCharactersInRegex: a intenção é justamente detectar caracteres de controle
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/;

/** Tamanho máximo de um slug em caracteres */
const MAX_SLUG_LENGTH = 100;

/**
 * Gera um slug a partir de texto (título ou autor) para uso em caminhos.
 *
 * Regras: minúsculas, sem diacríticos, caracteres não alfanuméricos viram
 * hífens, hífens consecutivos colapsam, sem hífens nas extremidades,
 * máximo de 100 caracteres.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RE, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ''); // o corte em 100 chars pode deixar hífen solto no fim
}

/**
 * Sanitiza um segmento de caminho, rejeitando entradas perigosas.
 *
 * Rejeita: path traversal ("../", "./", ".", ".."), separadores de caminho,
 * null bytes, caracteres de controle (0x00-0x1F, 0x7F) e nomes reservados
 * do Windows (CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9).
 *
 * @throws {Error} Se o segmento for perigoso ou inválido
 */
export function sanitizePath(segment: string): string {
  if (segment.length === 0) {
    throw new Error('Segmento de caminho vazio não é permitido');
  }

  if (CONTROL_CHARS_RE.test(segment)) {
    throw new Error(
      `Segmento de caminho contém caracteres de controle: ${JSON.stringify(segment)}`,
    );
  }

  // Um segmento nunca pode conter separadores — isso indica tentativa de traversal
  if (segment.includes('/') || segment.includes('\\')) {
    throw new Error(
      `Segmento de caminho contém separador de diretório: ${JSON.stringify(segment)}`,
    );
  }

  if (segment === '.' || segment === '..') {
    throw new Error(`Path traversal detectado no segmento: ${JSON.stringify(segment)}`);
  }

  if (WINDOWS_RESERVED_RE.test(segment)) {
    throw new Error(`Segmento usa nome reservado do Windows: ${JSON.stringify(segment)}`);
  }

  return segment;
}

/**
 * Constrói o caminho completo para o arquivo Markdown de um livro.
 *
 * Padrão (SPEC §6): {baseDir}/users/{userId}/books/{author-slug}/{title-slug}-{bookId}/clippings.md
 *
 * @throws {Error} Se algum segmento for perigoso ou o resultado escapar do baseDir
 */
export function buildBookPath(params: BuildBookPathParams): BookPath {
  const safeUserId = sanitizePath(params.userId);
  const safeBookId = sanitizePath(params.bookId);
  const authorSlug = slugify(params.author) || 'sem-autor';
  const titleSlug = slugify(params.title) || 'sem-titulo';

  const segments = ['users', safeUserId, 'books', authorSlug, `${titleSlug}-${safeBookId}`];

  const directory = join(params.baseDir, ...segments);
  const filePath = join(directory, 'clippings.md');
  const relativePath = join(...segments, 'clippings.md');

  // Defesa em profundidade: o caminho final deve permanecer dentro do baseDir
  if (!isWithinBase(filePath, params.baseDir)) {
    throw new Error(`Caminho resultante fora do diretório base: ${filePath}`);
  }

  return { directory, filePath, relativePath };
}

/**
 * Verifica se o caminho resolvido está dentro do diretório base permitido.
 *
 * Resolve ambos os caminhos e exige que o alvo seja o próprio baseDir ou
 * esteja sob ele (comparação por prefixo incluindo o separador, para não
 * aceitar irmãos como "/data-other" quando a base é "/data").
 */
export function isWithinBase(resolvedPath: string, baseDir: string): boolean {
  const resolvedBase = resolve(baseDir);
  // Se resolvedPath for absoluto, resolve o usa diretamente; senão, resolve contra baseDir
  const resolvedTarget = resolve(baseDir, resolvedPath);

  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + sep);
}
