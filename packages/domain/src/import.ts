/** Status de uma importação */
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Registro de importação */
export interface Import {
  /** Identificador único da importação (ULID) */
  id: string;
  /** Identificador do usuário dono da importação (ULID) */
  userId: string;
  /** Nome original do arquivo enviado */
  filename: string;
  /** Hash SHA-256 do arquivo original */
  fileHash: string;
  /** Status da importação */
  status: ImportStatus;
  /** Total de registros encontrados no arquivo */
  totalRecords: number;
  /** Registros efetivamente importados (novos) */
  importedRecords: number;
  /** Registros ignorados por duplicidade */
  duplicateRecords: number;
  /** Registros inválidos ou não reconhecidos */
  invalidRecords: number;
  /** Quando a importação foi iniciada (ISO 8601) */
  startedAt: string;
  /** Quando a importação foi concluída (ISO 8601), nulo enquanto em andamento */
  completedAt: string | null;
  /** Mensagem de erro (se falhou) */
  errorMessage: string | null;
}

/** Resultado de uma importação (resposta da API) */
export interface ImportResult {
  /** Identificador da importação (ULID) */
  importId: string;
  /** Status final da importação */
  status: ImportStatus;
  /** Total de registros encontrados no arquivo */
  totalRecords: number;
  /** Registros efetivamente importados (novos) */
  importedRecords: number;
  /** Registros ignorados por duplicidade */
  duplicateRecords: number;
  /** Registros inválidos ou não reconhecidos */
  invalidRecords: number;
  /** Livros que receberam novos clippings (ULIDs) */
  updatedBooks: string[];
}
