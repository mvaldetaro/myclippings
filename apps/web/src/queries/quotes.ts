import { get, triggerDownload } from '@/lib/api';

/** Retorna URL para pré-visualização da imagem de citação */
export function getQuoteImageUrl(bookId: string, clipId: string): string {
  return `/quotes/${bookId}/${clipId}`;
}

/** Dispara download da imagem de citação */
export async function downloadQuoteImage(bookId: string, clipId: string): Promise<void> {
  const blob = await get<Blob>(`/quotes/${bookId}/${clipId}/download`);
  triggerDownload(blob, `citacao-${clipId.slice(0, 8)}.png`);
}
