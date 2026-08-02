import { stringify } from 'yaml';
import type { SerializedBook } from './types';

/** Um clipping com fingerprint já calculado, pronto para serialização */
interface SerializableClipping {
  id: string;
  type: 'destaque' | 'nota' | 'marcador';
  content: string;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string;
}

/** Parâmetros para serializar um livro em Markdown */
interface SerializeBookParams {
  bookId: string;
  title: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  /** Versão do schema do Markdown (default: 1) */
  schemaVersion?: number;
  clippings: SerializableClipping[];
}

// Título de exibição capitalizado para cada tipo de clipping
const TYPE_HEADING: Record<SerializableClipping['type'], string> = {
  destaque: 'Destaque',
  nota: 'Nota',
  marcador: 'Marcador',
};

// Opções do YAML: chaves sem aspas, valores string com aspas duplas, sem quebra de linha
const YAML_OPTIONS = {
  defaultKeyType: 'PLAIN',
  defaultStringType: 'QUOTE_DOUBLE',
  lineWidth: 0,
} as const;

/**
 * Formata o par de localizações: exibe apenas o início quando início === fim,
 * senão exibe o intervalo "início-fim".
 */
function formatLocation(locationStart: number, locationEnd: number): string {
  if (locationStart === locationEnd) {
    return String(locationStart);
  }
  return `${locationStart}-${locationEnd}`;
}

/**
 * Converte o conteúdo do clipping em blockquote Markdown: cada linha recebe
 * o prefixo "> " e linhas vazias viram apenas ">".
 */
function toBlockquote(content: string): string[] {
  return content.split('\n').map((line) => (line.trim() === '' ? '>' : `> ${line}`));
}

/**
 * Monta as linhas de um único clipping (título, id, conteúdo e metadados).
 */
function serializeClipping(clipping: SerializableClipping): string[] {
  const lines: string[] = [
    `### ${TYPE_HEADING[clipping.type]}`,
    '',
    `<!-- clipping-id: ${clipping.id} -->`,
    '',
    ...toBlockquote(clipping.content),
    '',
    `- Tipo: ${clipping.type}`,
  ];

  // Página é opcional: só aparece quando presente
  if (clipping.page !== null) {
    lines.push(`- Página: ${clipping.page}`);
  }

  lines.push(`- Localização: ${formatLocation(clipping.locationStart, clipping.locationEnd)}`);
  lines.push(`- Data do Kindle: ${clipping.kindleDate}`);

  return lines;
}

/**
 * Serializa um livro e seus clippings para o formato Markdown (SPEC §7).
 *
 * A saída é determinística: mesma entrada produz exatamente os mesmos bytes.
 * Clippings são ordenados por kindleDate ascendente e separados por "---".
 * O arquivo termina com uma única quebra de linha.
 */
export function serializeBook(params: SerializeBookParams): SerializedBook {
  const schemaVersion = params.schemaVersion ?? 1;

  // Cópia ordenada por data ascendente (sort estável preserva ordem em empates)
  const sorted = [...params.clippings].sort((a, b) => a.kindleDate.localeCompare(b.kindleDate));

  const frontMatter = stringify(
    {
      schemaVersion,
      bookId: params.bookId,
      title: params.title,
      author: params.author,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
      clippingCount: sorted.length,
    },
    YAML_OPTIONS,
  );

  const lines: string[] = [
    '---',
    frontMatter.trimEnd(),
    '---',
    '',
    `# ${params.title}`,
    '',
    `**Autor:** ${params.author}`,
    '',
    '## Clippings',
  ];

  // Cada bloco de clipping é separado do anterior por uma linha horizontal "---"
  for (const [index, clipping] of sorted.entries()) {
    lines.push('');
    if (index > 0) {
      lines.push('---', '');
    }
    lines.push(...serializeClipping(clipping));
  }

  return {
    content: `${lines.join('\n')}\n`,
    clippingCount: sorted.length,
  };
}
