import { parse } from 'yaml';
import type { DeserializedBook, MarkdownClipping, MarkdownFrontMatter } from './types';

/** Versão do schema suportada por esta versão do pacote */
const SUPPORTED_SCHEMA_VERSION = 1;

/** Data padrão para clippings sem "Data do Kindle" (época Unix) */
const DEFAULT_KINDLE_DATE = new Date(0).toISOString();

// Front matter: abre com "---" na primeira linha e fecha com "---" em linha própria
const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

// Comentário HTML que carrega o fingerprint do clipping
const CLIPPING_ID_RE = /<!--\s*clipping-id:\s*(\S+)\s*-->/;

// Item de metadados do clipping: "- Rótulo: valor"
const METADATA_BULLET_RE = /^- ([^:]+):\s*(.*)$/;

// Título de exibição (capitalizado) → tipo interno do clipping
const HEADING_TYPE: Record<string, MarkdownClipping['type']> = {
  destaque: 'destaque',
  nota: 'nota',
  marcador: 'marcador',
};

/**
 * Extrai o front matter YAML e o corpo do Markdown.
 *
 * @throws {Error} Se o front matter estiver ausente ou com YAML inválido
 */
function extractFrontMatter(content: string): { frontMatter: MarkdownFrontMatter; body: string } {
  const match = content.match(FRONT_MATTER_RE);
  if (!match) {
    throw new Error('Front matter ausente: o arquivo deve iniciar com um bloco "---"');
  }

  const rawYaml = match[1] ?? '';
  const body = content.slice(match[0].length);

  let data: unknown;
  try {
    data = parse(rawYaml);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao interpretar o front matter YAML: ${reason}`);
  }

  return { frontMatter: validateFrontMatter(data), body };
}

/**
 * Valida a estrutura do front matter já interpretado.
 *
 * @throws {Error} Se campos obrigatórios estiverem ausentes ou a versão for desconhecida
 */
function validateFrontMatter(data: unknown): MarkdownFrontMatter {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Front matter inválido: esperado um objeto YAML');
  }

  const fm = data as Record<string, unknown>;

  if (fm.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion não suportada: ${String(fm.schemaVersion)} (esperada: ${SUPPORTED_SCHEMA_VERSION})`,
    );
  }

  if (typeof fm.bookId !== 'string') {
    throw new Error('Front matter inválido: campo "bookId" ausente ou não é string');
  }
  if (typeof fm.title !== 'string') {
    throw new Error('Front matter inválido: campo "title" ausente ou não é string');
  }
  if (typeof fm.author !== 'string') {
    throw new Error('Front matter inválido: campo "author" ausente ou não é string');
  }
  if (typeof fm.createdAt !== 'string') {
    throw new Error('Front matter inválido: campo "createdAt" ausente ou não é string');
  }
  if (typeof fm.updatedAt !== 'string') {
    throw new Error('Front matter inválido: campo "updatedAt" ausente ou não é string');
  }
  if (typeof fm.clippingCount !== 'number') {
    throw new Error('Front matter inválido: campo "clippingCount" ausente ou não é número');
  }

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    bookId: fm.bookId,
    title: fm.title,
    author: fm.author,
    createdAt: fm.createdAt,
    updatedAt: fm.updatedAt,
    clippingCount: fm.clippingCount,
  };
}

/**
 * Interpreta o valor da localização: "135-138" vira intervalo, "200" vira ponto único.
 * Valores inválidos caem no padrão 1-1.
 */
function parseLocation(value: string): { locationStart: number; locationEnd: number } {
  const [start, end] = value.split('-').map((part) => Number(part.trim()));

  if (start === undefined || Number.isNaN(start)) {
    return { locationStart: 1, locationEnd: 1 };
  }

  const locationEnd = end === undefined || Number.isNaN(end) ? start : end;
  return { locationStart: start, locationEnd };
}

/**
 * Interpreta um bloco de clipping (linhas entre separadores "---").
 *
 * Campos opcionais usam padrões resilientes: page=null, localização 1-1,
 * data na época Unix.
 *
 * @throws {Error} Se o tipo (título) ou o id (comentário) estiverem ausentes
 */
function parseClippingChunk(chunk: string): MarkdownClipping {
  let type: MarkdownClipping['type'] | null = null;
  let id: string | null = null;
  const contentLines: string[] = [];
  let page: number | null = null;
  let locationStart = 1;
  let locationEnd = 1;
  let kindleDate = DEFAULT_KINDLE_DATE;

  for (const line of chunk.split('\n')) {
    if (line.startsWith('### ')) {
      // Título do clipping define o tipo ("### Destaque" → destaque)
      const heading = line.slice(4).trim().toLowerCase();
      const mapped = HEADING_TYPE[heading];
      if (!mapped) {
        throw new Error(`Tipo de clipping não reconhecido no título: "${line.slice(4).trim()}"`);
      }
      type = mapped;
    } else if (line.startsWith('<!--')) {
      const idMatch = line.match(CLIPPING_ID_RE);
      if (idMatch?.[1]) {
        id = idMatch[1];
      }
    } else if (line.startsWith('>')) {
      // Blockquote: ">" sozinho é linha vazia; "> texto" remove o prefixo
      contentLines.push(line === '>' ? '' : line.replace(/^> ?/, ''));
    } else if (line.startsWith('- ')) {
      const bullet = line.match(METADATA_BULLET_RE);
      if (bullet) {
        const key = bullet[1]?.trim() ?? '';
        const value = bullet[2] ?? '';

        if (key === 'Página') {
          const parsed = Number(value);
          page = Number.isNaN(parsed) ? null : parsed;
        } else if (key === 'Localização') {
          const location = parseLocation(value);
          locationStart = location.locationStart;
          locationEnd = location.locationEnd;
        } else if (key === 'Data do Kindle') {
          kindleDate = value;
        }
        // "Tipo" é ignorado: o título "### X" é a fonte da verdade
      }
    }
  }

  if (!type) {
    throw new Error(
      'Clipping sem título de tipo (esperado "### Destaque", "### Nota" ou "### Marcador")',
    );
  }
  if (!id) {
    throw new Error('Clipping sem comentário de id (esperado "<!-- clipping-id: ... -->")');
  }

  return {
    id,
    type,
    content: contentLines.join('\n'),
    page,
    locationStart,
    locationEnd,
    kindleDate,
  };
}

/**
 * Faz o parsing de um arquivo Markdown de livro em dados estruturados.
 *
 * O front matter é a fonte da verdade para os metadados do livro. Clippings
 * são lidos da seção "## Clippings", separados por linhas "---".
 *
 * @throws {Error} Se o front matter estiver ausente/inválido ou um clipping estiver malformado
 */
export function deserializeBook(content: string): DeserializedBook {
  const { frontMatter, body } = extractFrontMatter(content);

  // Normaliza quebras de linha para simplificar o parsing linha a linha
  const bodyLines = body.replace(/\r\n/g, '\n').split('\n');

  // Localiza o início da seção de clippings; ausência significa livro sem clippings
  const clippingsStart = bodyLines.findIndex((line) => line.trim() === '## Clippings');
  if (clippingsStart === -1) {
    return { frontMatter, clippings: [] };
  }

  // Divide a região de clippings nos separadores "---" (linha exata)
  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of bodyLines.slice(clippingsStart + 1)) {
    if (line === '---') {
      chunks.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  chunks.push(current.join('\n'));

  const clippings: MarkdownClipping[] = [];
  for (const chunk of chunks) {
    // Ignora blocos vazios (ex: trecho final após o último separador)
    if (chunk.trim() === '') continue;
    clippings.push(parseClippingChunk(chunk));
  }

  return { frontMatter, clippings };
}

/**
 * Lê apenas o front matter de um Markdown (sem processar clippings).
 *
 * @throws {Error} Se o front matter estiver ausente, com YAML inválido ou versão desconhecida
 */
export function readFrontMatter(content: string): MarkdownFrontMatter {
  return extractFrontMatter(content).frontMatter;
}
