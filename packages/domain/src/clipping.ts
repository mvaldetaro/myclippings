/** Tipo de clipping do Kindle */
export type ClippingType = 'destaque' | 'nota' | 'marcador';

/** Um clipping individual extraído do arquivo do Kindle */
export interface Clipping {
  /** Identificador determinístico do clipping (SHA-256 fingerprint) */
  id: string;
  /** Identificador do livro ao qual pertence (ULID) */
  bookId: string;
  /** Tipo do clipping (destaque, nota, marcador) */
  type: ClippingType;
  /** Conteúdo original do clipping */
  content: string;
  /** Número da página (opcional) */
  page: number | null;
  /** Localização inicial no Kindle */
  locationStart: number;
  /** Localização final no Kindle */
  locationEnd: number;
  /** Data registrada pelo Kindle (ISO 8601) */
  kindleDate: string;
  /** Data de criação do registro no sistema (ISO 8601) */
  createdAt: string;
}

/** Clipping sem o fingerprint (antes do cálculo) */
export interface RawClipping {
  /** Título do livro (antes de resolver o bookId) */
  title: string;
  /** Autor do livro (antes de resolver o bookId) */
  author?: string;
  /** Tipo do clipping (destaque, nota, marcador) */
  type: ClippingType;
  /** Conteúdo original do clipping */
  content: string;
  /** Número da página (opcional) */
  page: number | null;
  /** Localização inicial no Kindle */
  locationStart: number;
  /** Localização final no Kindle */
  locationEnd: number;
  /** Data registrada pelo Kindle (ISO 8601) */
  kindleDate: string;
}

/** Metadados de um clipping para sumário */
export interface ClippingSummary {
  /** Identificador determinístico do clipping (SHA-256 fingerprint) */
  id: string;
  /** Tipo do clipping (destaque, nota, marcador) */
  type: ClippingType;
  /** Prévia do conteúdo (máx. 150 caracteres) */
  contentPreview: string;
  /** Número da página (opcional) */
  page: number | null;
  /** Data registrada pelo Kindle (ISO 8601) */
  kindleDate: string;
}
