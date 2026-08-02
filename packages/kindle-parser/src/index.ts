import type { ClippingType, RawClipping } from '@my-clippings/schemas';

/** Um registro bruto extraído antes do parsing completo dos metadados */
interface RawRecord {
  title: string;
  author: string;
  type: ClippingType;
  content: string;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string;
}

/** Opções do parser */
export interface ParserOptions {
  /** Encoding padrão se não for detectado (default: 'utf-8') */
  defaultEncoding?: BufferEncoding;
  /** Tamanho máximo do arquivo em bytes (default: 50MB) */
  maxFileSize?: number;
}

const DEFAULT_OPTIONS: Required<ParserOptions> = {
  defaultEncoding: 'utf-8',
  maxFileSize: 50 * 1024 * 1024, // 50 MB
};

// ─── Constantes ──────────────────────────────────────────────────────────────

// Marcador de separação entre registros no arquivo do Kindle
const SEPARATOR = '==========';

// Expressão regular para a primeira linha de um registro: "Título (Autor)"
// Suporta BOM (\uFEFF) no início do arquivo
const TITLE_AUTHOR_RE = /^\uFEFF?(.+?)\s*\((.+?)\)\s*$/;

// Expressões para a segunda linha (metadados do clipping)

// Padrão em português: "- Seu destaque na página X-Y | posição A-B | Adicionado: dia, DD..."
// Padrão em português (sem página): "- Seu destaque [na|ou] posição X-Y | Adicionado: dia, DD..."
// Suporta variações regionais do Kindle: "na posição", "ou posição", "posição" após página
const METADATA_PT_RE =
  /^-\s*(?:Seu|Sua)\s+(destaque|nota|marcador)\s+(?:na\s+página\s+(\d+)(?:-(\d+))?\s*\|\s*)?(?:(?:(?:na|ou)\s+)?posição\s+(\d+)(?:-(\d+))?\s*\|\s*)?Adicionado:\s+(.+)$/i;

// Padrão em inglês: "- Your Highlight on page X-Y | Added on Day, Month DD, YYYY HH:MM:SS"
// Padrão em inglês (sem página): "- Your Highlight at location X-Y | Added on..."
// Suporta variação híbrida EN/PT: "Your Highlight on page X | Location Y-Z | Added on [pt-date]"
const METADATA_EN_RE =
  /^-\s*Your\s+(Highlight|Note|Bookmark)\s+(?:on\s+page\s+(\d+)(?:-(\d+))?\s*\|\s*)?(?:(?:at\s+)?location\s+(\d+)(?:-(\d+))?\s*\|\s*)?Added\s+on\s+(.+)$/i;

// Meses em português para parsing de data
const MONTHS_PT: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

// ─── Tipos de clipping traduzidos ────────────────────────────────────────────

const TYPE_MAP_PT: Record<string, ClippingType> = {
  destaque: 'destaque',
  nota: 'nota',
  marcador: 'marcador',
};

const TYPE_MAP_EN: Record<string, ClippingType> = {
  highlight: 'destaque',
  note: 'nota',
  bookmark: 'marcador',
};

// ─── Funções auxiliares ──────────────────────────────────────────────────────

/**
 * Detecta e remove BOM (Byte Order Mark) do início do conteúdo.
 * Suporta UTF-8 BOM (EF BB BF).
 */
function stripBOM(content: string): { text: string; hadBOM: boolean } {
  if (content.charCodeAt(0) === 0xfeff) {
    return { text: content.slice(1), hadBOM: true };
  }
  return { text: content, hadBOM: false };
}

/**
 * Converte quebras de linha CRLF (\r\n) ou CR (\r) para LF (\n).
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Faz o parsing de uma data no formato português do Kindle:
 * "domingo, 24 de novembro de 2024 15:44:40"
 */
function parsePTDate(dateStr: string): string | null {
  // Remove o dia da semana
  const cleaned = dateStr.replace(/^[^,]+,\s*/, '').trim();

  // Padrão: "24 de novembro de 2024 15:44:40"
  const match = cleaned.match(/^(\d{1,2})\s+de\s+(\S+)\s+de\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/i);
  if (!match) return null;

  const [, day, monthStr, year, hour, minute, second] = match;
  const month = MONTHS_PT[monthStr?.toLowerCase() ?? ''];

  if (month === undefined) return null;

  const date = new Date(
    Number(year),
    month,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (isNaN(date.getTime())) return null;

  // Retorna no formato ISO 8601 com offset local
  return date.toISOString();
}

/**
 * Faz o parsing de uma data no formato inglês do Kindle:
 * "Sunday, November 24, 2024 15:44:40"
 */
function parseENDate(dateStr: string): string | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Extrai título e autor da primeira linha do registro.
 * Formato: "Título do Livro (Nome do Autor)"
 */
function parseTitleAuthor(line: string): { title: string; author: string } | null {
  const match = line.match(TITLE_AUTHOR_RE);
  if (!match) return null;

  const [, title, author] = match;
  return {
    title: title?.trim() ?? '',
    author: author?.trim() ?? '',
  };
}

/**
 * Extrai metadados do clipping da linha de metadados.
 * Suporta formatos em português e inglês, com ou sem página.
 */
function parseMetadata(line: string): {
  type: ClippingType;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string | null;
} | null {
  // Tenta formato português primeiro
  const ptMatch = line.match(METADATA_PT_RE);
  if (ptMatch) {
    const [, typePt, pageStr, pageEndStr, locStartStr, locEndStr, dateStr] = ptMatch;
    const type = TYPE_MAP_PT[typePt?.toLowerCase() ?? ''];
    if (!type) return null;

    let page: number | null = null;
    let locationStart = 0;
    let locationEnd = 0;

    // Extrai página se disponível (formato com "na página X" ou "na página X-Y")
    if (pageStr) {
      page = Number(pageStr);
      // Se tem página final (ex: página 10-12), usamos como intervalo de página
      // mas para location mantemos o que está após "posição"
    }

    // Extrai localização (formato com "na posição X-Y")
    if (locStartStr) {
      locationStart = Number(locStartStr);
      locationEnd = locEndStr ? Number(locEndStr) : locationStart;
    } else if (pageStr) {
      // Se só tem página, usamos página como localização aproximada
      locationStart = Number(pageStr);
      locationEnd = pageEndStr ? Number(pageEndStr) : locationStart;
    }

    // Se não encontrou posição nem página, mas a data existe, é um clipping sem localização
    // (ex: marcadores podem não ter posição)
    if (!locStartStr && !pageStr) {
      locationStart = 1;
      locationEnd = 1;
    }

    const kindleDate = dateStr ? parsePTDate(dateStr.trim()) : null;

    return { type, page, locationStart, locationEnd, kindleDate };
  }

  // Tenta formato inglês
  const enMatch = line.match(METADATA_EN_RE);
  if (enMatch) {
    const [, typeEn, pageStr, pageEndStr, locStartStr, locEndStr, dateStr] = enMatch;
    const type = TYPE_MAP_EN[typeEn?.toLowerCase() ?? ''];
    if (!type) return null;

    let page: number | null = null;
    let locationStart = 0;
    let locationEnd = 0;

    if (pageStr) {
      page = Number(pageStr);
    }

    if (locStartStr) {
      locationStart = Number(locStartStr);
      locationEnd = locEndStr ? Number(locEndStr) : locationStart;
    } else if (pageStr) {
      locationStart = Number(pageStr);
      locationEnd = pageEndStr ? Number(pageEndStr) : locationStart;
    }

    if (!locStartStr && !pageStr) {
      locationStart = 1;
      locationEnd = 1;
    }

    // Tenta parse EN primeiro; fallback para PT (híbrido EN/PT)
    let kindleDate = dateStr ? parseENDate(dateStr.trim()) : null;
    if (!kindleDate && dateStr) {
      kindleDate = parsePTDate(dateStr.trim());
    }

    return { type, page, locationStart, locationEnd, kindleDate };
  }

  return null;
}

// ─── Parser principal ────────────────────────────────────────────────────────

/**
 * Divide o conteúdo do arquivo em registros individuais usando o separador "==========".
 */
function splitRecords(content: string): string[] {
  const records: string[] = [];
  const parts = content.split(SEPARATOR);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      records.push(trimmed);
    }
  }

  return records;
}

/**
 * Faz o parsing de um registro individual em um RawRecord.
 */
function parseRecord(block: string): RawRecord | null {
  const lines = block.split('\n');

  // Remove linhas vazias do início
  let lineIndex = 0;
  while (lineIndex < lines.length && (lines[lineIndex]?.trim() ?? '') === '') {
    lineIndex++;
  }

  if (lineIndex >= lines.length) return null;

  // Primeira linha: título e autor
  const titleAuthorLine = lines[lineIndex]?.trim() ?? '';
  const titleAuthor = parseTitleAuthor(titleAuthorLine);
  if (!titleAuthor) return null;
  lineIndex++;

  // Segunda linha: metadados
  if (lineIndex >= lines.length) return null;
  const metadataLine = lines[lineIndex]?.trim() ?? '';
  const metadata = parseMetadata(metadataLine);
  if (!metadata) return null;
  lineIndex++;

  // Pula linha em branco entre metadados e conteúdo
  while (lineIndex < lines.length && (lines[lineIndex]?.trim() ?? '') === '') {
    lineIndex++;
  }

  // Linhas restantes: conteúdo do clipping (pode ser múltiplas linhas)
  const contentLines: string[] = [];
  while (lineIndex < lines.length) {
    const line = lines[lineIndex] ?? '';
    // Para ao encontrar linha em branco que precede o próximo registro
    // (mas preserva linhas em branco internas do conteúdo)
    contentLines.push(line);
    lineIndex++;
  }

  // Remove linhas vazias do final do conteúdo
  while (contentLines.length > 0 && (contentLines[contentLines.length - 1]?.trim() ?? '') === '') {
    contentLines.pop();
  }

  const content = contentLines.join('\n').trim();

  // Marcadores podem não ter conteúdo textual
  if (content.length === 0 && metadata.type !== 'marcador') return null;

  return {
    title: titleAuthor.title,
    author: titleAuthor.author,
    type: metadata.type,
    content,
    page: metadata.page,
    locationStart: metadata.locationStart,
    locationEnd: metadata.locationEnd,
    kindleDate: metadata.kindleDate ?? new Date().toISOString(),
  };
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Resultado do parsing do arquivo My Clippings.txt.
 */
export interface ParseResult {
  /** Registros extraídos com sucesso */
  records: RawRecord[];
  /** Contagem de registros que não puderam ser interpretados */
  invalidCount: number;
  /** Se o arquivo continha BOM (UTF-8 com BOM) */
  hasBOM: boolean;
  /** Número total de blocos (registros) encontrados no arquivo */
  totalBlocks: number;
}

/**
 * Faz o parsing de um arquivo My Clippings.txt (buffer) em registros estruturados.
 *
 * Suporta:
 * - UTF-8 com e sem BOM
 * - Quebras de linha LF (\n) e CRLF (\r\n)
 * - Formatos de metadados em português e inglês
 * - Páginas e localizações opcionais
 *
 * @param buffer - Conteúdo do arquivo como Buffer
 * @param options - Opções de parsing
 * @returns Resultado do parsing com registros válidos e contagem de inválidos
 * @throws {Error} Se o arquivo exceder o tamanho máximo
 */
export function parseClippingsFile(buffer: Buffer, options: ParserOptions = {}): ParseResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Valida o tamanho do arquivo
  if (buffer.length > opts.maxFileSize) {
    throw new Error(
      `Arquivo excede o tamanho máximo permitido de ${opts.maxFileSize / (1024 * 1024)} MB`,
    );
  }

  // Converte buffer para string, detectando encoding
  let content: string;
  try {
    content = buffer.toString('utf-8');
  } catch {
    content = buffer.toString(opts.defaultEncoding);
  }

  // Remove BOM se presente
  const { text: cleanContent, hadBOM: hasBOM } = stripBOM(content);

  // Normaliza quebras de linha
  const normalized = normalizeLineEndings(cleanContent);

  // Divide em registros
  const blocks = splitRecords(normalized);

  // Faz o parsing de cada bloco
  const records: RawRecord[] = [];
  let invalidCount = 0;

  for (const block of blocks) {
    const record = parseRecord(block);
    if (record) {
      records.push(record);
    } else {
      invalidCount++;
    }
  }

  return {
    records,
    invalidCount,
    hasBOM,
    totalBlocks: blocks.length,
  };
}

/**
 * Converte um RawRecord em um RawClipping (formato do schema).
 */
export function toRawClipping(record: RawRecord): RawClipping {
  return {
    title: record.title,
    author: record.author,
    type: record.type,
    content: record.content,
    page: record.page,
    locationStart: record.locationStart,
    locationEnd: record.locationEnd,
    kindleDate: record.kindleDate,
  };
}
