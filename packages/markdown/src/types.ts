/** Front matter dos metadados do livro no Markdown */
export interface MarkdownFrontMatter {
  schemaVersion: number;
  bookId: string; // ULID
  title: string;
  author: string;
  /** URL da capa do livro (OpenLibrary Covers API), opcional */
  coverUrl?: string | null;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
  clippingCount: number;
}

/** Um clipping dentro de um arquivo Markdown */
export interface MarkdownClipping {
  id: string; // fingerprint SHA-256 (sha256:...)
  type: 'destaque' | 'nota' | 'marcador';
  content: string;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string; // ISO 8601 datetime
}

/** Resultado da serialização de um livro para Markdown */
export interface SerializedBook {
  /** Conteúdo Markdown completo */
  content: string;
  /** Total de clippings incluídos */
  clippingCount: number;
}

/** Resultado da leitura de um arquivo Markdown */
export interface DeserializedBook {
  frontMatter: MarkdownFrontMatter;
  clippings: MarkdownClipping[];
}
