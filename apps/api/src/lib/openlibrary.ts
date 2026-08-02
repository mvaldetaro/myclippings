/**
 * Cliente para a API do OpenLibrary — busca metadados e capas de livros.
 *
 * Endpoints utilizados:
 *   - Search API: https://openlibrary.org/search.json?q=...&limit=1
 *   - Covers API: https://covers.openlibrary.org/b/id/{coverId}-{size}.jpg
 *
 * Tamanhos de capa disponíveis: S (small), M (medium), L (large).
 */
const OPENLIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const COVER_SIZE = 'M'; // Medium — adequado para exibição na página de detalhes

/** Resultado da busca por livro no OpenLibrary */
interface OpenLibrarySearchResult {
  docs: Array<{
    /** ID da capa no repositório de covers */
    cover_i?: number;
    title: string;
    author_name?: string[];
    key: string;
  }>;
}

/**
 * Constrói a URL da capa a partir do ID de cover do OpenLibrary.
 *
 * @param coverId - ID numérico da capa (campo `cover_i` da Search API)
 * @param size - Tamanho da imagem: 'S', 'M' ou 'L' (default: 'M')
 * @returns URL completa da imagem da capa
 */
export function buildCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = COVER_SIZE): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/**
 * Busca a capa de um livro no OpenLibrary por título e autor.
 *
 * Estratégia:
 *   1. Consulta a Search API com `title + author` como query
 *   2. Extrai o `cover_i` do primeiro resultado
 *   3. Retorna a URL da capa em tamanho médio
 *
 * A operação é best-effort: falhas de rede ou ausência de resultados
 * retornam `null` silenciosamente — a capa é opcional.
 *
 * @param title  - Título do livro
 * @param author - Autor do livro
 * @returns URL da capa ou `null` se não encontrada/erro
 */
export async function fetchBookCover(title: string, author: string): Promise<string | null> {
  const query = encodeURIComponent(`${title} ${author}`);
  const url = `${OPENLIBRARY_SEARCH_URL}?q=${query}&limit=1&fields=cover_i,title,author_name`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'MyClippings/1.0 (book-organizer)' },
    });
  } catch {
    // Erro de rede (DNS, timeout, etc.) — ignora silenciosamente
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let data: OpenLibrarySearchResult;
  try {
    data = (await response.json()) as OpenLibrarySearchResult;
  } catch {
    return null;
  }

  const coverId = data.docs?.[0]?.cover_i;
  if (!coverId) return null;

  return buildCoverUrl(coverId);
}
