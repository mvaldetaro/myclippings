import { get, getText, triggerDownload } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

/** Livro na listagem (resposta de GET /books) */
export interface BookListItem {
  id: string;
  title: string;
  author: string;
  clippingCount: number;
  updatedAt: string;
  schemaVersion: number;
}

/** Livro com clippings (resposta de GET /books/:bookId) */
export interface BookWithClippingsResponse {
  book: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    clippingCount: number;
    schemaVersion: number;
  };
  clippings: Array<{
    id: string;
    type: 'destaque' | 'nota' | 'marcador';
    content: string;
    page: number | null;
    locationStart: number;
    locationEnd: number;
    kindleDate: string;
  }>;
}

/** Lista livros do usuário com busca opcional */
export function useBooks(search?: string) {
  return useQuery<{ books: BookListItem[] }>({
    queryKey: ['books', { search }],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return get<{ books: BookListItem[] }>(`/books${params}`);
    },
  });
}

/** Obtém um livro com seus clippings */
export function useBook(bookId: string) {
  return useQuery<BookWithClippingsResponse>({
    queryKey: ['books', bookId],
    queryFn: () => get<BookWithClippingsResponse>(`/books/${bookId}`),
    enabled: !!bookId,
  });
}

/** Dispara download do arquivo Markdown do livro */
export function useDownloadBook() {
  return {
    download: async (bookId: string, title: string) => {
      const blob = await get<Blob>(`/books/${bookId}/download`);
      triggerDownload(blob, `${title}.md`);
    },
  };
}

/** Obtém o conteúdo raw do Markdown do livro para visualização */
export function useMarkdownContent(bookId: string) {
  return useQuery<string>({
    queryKey: ['books', bookId, 'markdown'],
    queryFn: () => getText(`/books/${bookId}/markdown`),
    enabled: false, // só busca sob demanda (abertura do modal)
  });
}
