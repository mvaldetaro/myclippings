import { get } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

/** Filtros de clippings */
export interface ClippingFilters {
  text?: string;
  type?: 'destaque' | 'nota' | 'marcador';
  page?: number;
  startDate?: string;
  endDate?: string;
  sort?: 'date-asc' | 'date-desc';
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

/** Lista clippings de um livro com filtros opcionais */
export function useClippings(bookId: string, filters?: ClippingFilters) {
  const params = new URLSearchParams();
  if (filters?.text) params.set('text', filters.text);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.page !== undefined) params.set('page', String(filters.page));
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.sort) params.set('sort', filters.sort);

  const queryString = params.toString();
  const url = `/clippings/${bookId}${queryString ? `?${queryString}` : ''}`;

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
    queryFn: () => get<ClippingResponse>(`/clippings/${bookId}/${clipId}`),
    enabled: !!bookId && !!clipId,
  });
}
