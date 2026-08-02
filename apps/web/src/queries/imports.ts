import { uploadFile } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** Resultado da importação */
export interface ImportResultResponse {
  importId: string;
  status: 'completed' | 'failed';
  totalRecords: number;
  importedRecords: number;
  duplicateRecords: number;
  invalidRecords: number;
  updatedBooks: string[];
}

/** Faz upload do arquivo My Clippings.txt */
export function useImport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadFile<ImportResultResponse>('/imports', file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
