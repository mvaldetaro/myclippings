import { get, patch } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Filtros de clippings */
export interface ClippingFilters {
  text?: string;
  type?: 'destaque' | 'nota' | 'marcador';
  page?: number;
  startDate?: string;
  endDate?: string;
  sort?: 'date-asc' | 'date-desc';
  favorites?: boolean;
}

/** Clipping individual da API */
export interface ClippingResponse {
  id: string;
  type: 'destaque' | 'nota' | 'marcador';
  content: string;
  page: number | null;
  locationStart: number;
  locationEnd: number;
  kindleDate: string;
}

/** Clipping favorito com metadados do livro */
export interface FavoriteClippingResponse extends ClippingResponse {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  favoritedAt: string;
}

/** Resposta do toggle de favorito */
export interface ToggleFavoriteResponse {
  favorited: boolean;
}

/** Lista clippings de um livro com filtros opcionais */
export function useClippings(bookId: string, filters?: ClippingFilters) {
  const params = new URLSearchParams();
  if (filters?.text) params.set('text', filters.text);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.page !== undefined) params.set('page', String(filters.page));
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.favorites) params.set('favorites', 'true');

  const queryString = params.toString();
  const url = `/api/clippings/${bookId}${queryString ? `?${queryString}` : ''}`;

  return useQuery<{ clippings: ClippingResponse[] }>({
    queryKey: ['clippings', bookId, filters],
    queryFn: () => get<{ clippings: ClippingResponse[] }>(url),
    enabled: !!bookId,
  });
}

/** Obtém um clipping individual */
export function useClipping(bookId: string, clipId: string) {
  return useQuery<ClippingResponse>({
    queryKey: ['clippings', bookId, clipId],
    queryFn: () => get<ClippingResponse>(`/api/clippings/${bookId}/${clipId}`),
    enabled: !!bookId && !!clipId,
  });
}

/** Alterna o estado de favorito de um clipping */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation<ToggleFavoriteResponse, Error, { bookId: string; clipId: string }>({
    mutationFn: ({ bookId, clipId }) =>
      patch<ToggleFavoriteResponse>(`/api/clippings/${bookId}/${clipId}/favorite`),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['clippings', bookId] });
      queryClient.invalidateQueries({ queryKey: ['favorite-clippings'] });
    },
  });
}

/** Lista todos os clippings favoritados, com filtro opcional por bookId */
export function useFavoriteClippings(bookId?: string) {
  const params = new URLSearchParams();
  if (bookId) params.set('bookId', bookId);

  const queryString = params.toString();
  const url = `/api/clippings/favorites${queryString ? `?${queryString}` : ''}`;

  return useQuery<{ favorites: FavoriteClippingResponse[] }>({
    queryKey: ['favorite-clippings', bookId],
    queryFn: () => get<{ favorites: FavoriteClippingResponse[] }>(url),
  });
}
