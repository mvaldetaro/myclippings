import { z } from 'zod';

/** Status de uma importação */
export const ImportStatus = z.enum(['pending', 'processing', 'completed', 'failed']);
export type ImportStatus = z.infer<typeof ImportStatus>;

/** Registro de importação */
export const ImportSchema = z.object({
  id: z.string().ulid(),
  userId: z.string().ulid(),
  /** Nome original do arquivo enviado */
  filename: z.string().max(255),
  /** Hash SHA-256 do arquivo original */
  fileHash: z.string(),
  /** Status da importação */
  status: ImportStatus,
  /** Total de registros encontrados no arquivo */
  totalRecords: z.number().int().nonnegative(),
  /** Registros efetivamente importados (novos) */
  importedRecords: z.number().int().nonnegative(),
  /** Registros ignorados por duplicidade */
  duplicateRecords: z.number().int().nonnegative(),
  /** Registros inválidos ou não reconhecidos */
  invalidRecords: z.number().int().nonnegative(),
  /** Quando a importação foi iniciada */
  startedAt: z.string().datetime(),
  /** Quando a importação foi concluída */
  completedAt: z.string().datetime().nullable(),
  /** Mensagem de erro (se falhou) */
  errorMessage: z.string().nullable(),
});

export type Import = z.infer<typeof ImportSchema>;

/** Resultado de uma importação (resposta da API) */
export const ImportResultSchema = z.object({
  importId: z.string().ulid(),
  status: ImportStatus,
  totalRecords: z.number().int().nonnegative(),
  importedRecords: z.number().int().nonnegative(),
  duplicateRecords: z.number().int().nonnegative(),
  invalidRecords: z.number().int().nonnegative(),
  /** Livros que receberam novos clippings */
  updatedBooks: z.array(z.string().ulid()),
});

export type ImportResult = z.infer<typeof ImportResultSchema>;
