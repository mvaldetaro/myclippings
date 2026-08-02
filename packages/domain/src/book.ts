/** Um livro com seus metadados */
export interface Book {
  /** Identificador único e estável do livro (ULID) */
  id: string;
  /** Título original do livro */
  title: string;
  /** Autor do livro */
  author: string;
  /** Slug do título para caminhos no sistema de arquivos */
  titleSlug: string;
  /** Slug do autor para caminhos no sistema de arquivos */
  authorSlug: string;
  /** Quantidade de clippings */
  clippingCount: number;
  /** Data de criação do arquivo Markdown (ISO 8601) */
  createdAt: string;
  /** Data da última atualização do arquivo Markdown (ISO 8601) */
  updatedAt: string;
  /** Versão do schema do Markdown */
  schemaVersion: number;
}

/** Identidade de um livro (título + autor) */
export interface BookIdentity {
  /** Título do livro */
  title: string;
  /** Autor do livro */
  author: string;
}

/** Entrada para criação de um livro */
export interface CreateBookInput {
  /** Título do livro */
  title: string;
  /** Autor do livro */
  author: string;
}

/**
 * Cria a identidade de um livro a partir do título e do autor,
 * removendo espaços em branco das extremidades.
 */
export function createBookIdentity(title: string, author: string): BookIdentity {
  return { title: title.trim(), author: author.trim() };
}

/**
 * Normaliza a identidade de um livro para fins de comparação:
 * remove espaços das extremidades e colapsa espaços internos múltiplos
 * em um único espaço. A caixa original é preservada na saída — para
 * comparação case-insensitive, o consumidor deve aplicar `toLowerCase()`.
 */
export function normalizeBookIdentity(identity: BookIdentity): BookIdentity {
  return {
    title: identity.title.trim().replace(/\s+/g, ' '),
    author: identity.author.trim().replace(/\s+/g, ' '),
  };
}
