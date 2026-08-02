import { get, triggerDownload } from '@/lib/api';
import type { QuotePreferences } from '@my-clippings/schemas';

/** Retorna URL para pré-visualização da imagem de citação com overrides opcionais */
export function getQuoteImageUrl(bookId: string, clipId: string, overrides?: Partial<QuotePreferences>): string {
  const params = new URLSearchParams();
  if (overrides?.backgroundColor) params.set('bg', overrides.backgroundColor);
  if (overrides?.textColor) params.set('text', overrides.textColor);
  if (overrides?.showAuthor !== undefined) params.set('showAuthor', String(overrides.showAuthor));
  if (overrides?.showBookTitle !== undefined) params.set('showBookTitle', String(overrides.showBookTitle));

  const qs = params.toString();
  return qs ? `/api/quotes/${bookId}/${clipId}?${qs}` : `/api/quotes/${bookId}/${clipId}`;
}

/** Dispara download da imagem de citação com overrides opcionais */
export async function downloadQuoteImage(bookId: string, clipId: string, overrides?: Partial<QuotePreferences>): Promise<void> {
  const params = new URLSearchParams();
  if (overrides?.backgroundColor) params.set('bg', overrides.backgroundColor);
  if (overrides?.textColor) params.set('text', overrides.textColor);
  if (overrides?.showAuthor !== undefined) params.set('showAuthor', String(overrides.showAuthor));
  if (overrides?.showBookTitle !== undefined) params.set('showBookTitle', String(overrides.showBookTitle));

  const qs = params.toString();
  const url = qs ? `/api/quotes/${bookId}/${clipId}/download?${qs}` : `/api/quotes/${bookId}/${clipId}/download`;
  const blob = await get<Blob>(url);
  triggerDownload(blob, `citacao-${clipId.slice(0, 8)}.png`);
}
