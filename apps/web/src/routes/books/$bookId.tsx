import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowUpDown,
  BookOpen,
  Copy,
  CopyCheck,
  Download,
  Eye,
  FileText,
  Heart,
  Image,
  Search,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PageSpinner } from '../../components/LoadingState';
import { MarkdownPreview } from '../../components/MarkdownPreview';
import { clippingTypeLabel, formatDate } from '../../lib/utils';
import { useBook, useDownloadBook, useMarkdownContent } from '../../queries/books';
import { type ClippingFilters, useClippings, useFavoriteClippings } from '../../queries/clippings';
import type { ClippingResponse } from '../../queries/clippings';
import { useToggleFavorite } from '../../queries/clippings';

export const Route = createFileRoute('/books/$bookId')({
  component: BookDetailPage,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h2 className="headline-lg text-text mb-2">Livro não encontrado</h2>
      <p className="body-md text-muted">O livro que você procura não existe ou foi removido.</p>
    </div>
  ),
});

function BookDetailPage() {
  const { bookId } = Route.useParams();
  const { data: bookData, isLoading, isError, refetch } = useBook(bookId);

  // Filtros locais
  const [textFilter, setTextFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'date-asc' | 'date-desc'>('date-desc');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filters: ClippingFilters = useMemo(
    () => ({
      text: textFilter || undefined,
      type:
        typeFilter === '' || typeFilter === 'todos'
          ? undefined
          : (typeFilter as 'destaque' | 'nota' | 'marcador'),
      sort: sortOrder,
      favorites: favoritesOnly || undefined,
    }),
    [textFilter, typeFilter, sortOrder, favoritesOnly],
  );

  const {
    data: clippingsData,
    isLoading: clipsLoading,
    isError: clipsError,
    refetch: refetchClips,
  } = useClippings(bookId, filters);

  const { download } = useDownloadBook();
  const toggleFavorite = useToggleFavorite();
  const { data: favoritesData } = useFavoriteClippings(bookId);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMdId, setCopiedMdId] = useState<string | null>(null);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  const {
    data: markdownContent,
    isLoading: markdownLoading,
    isError: markdownError,
    refetch: refetchMarkdown,
  } = useMarkdownContent(bookId);

  const book = bookData?.book;
  const clippings = clippingsData?.clippings ?? [];
  const favoritedIds = useMemo(
    () => new Set((favoritesData?.favorites ?? []).map((f) => f.id)),
    [favoritesData],
  );

  // Copiar clipping individual
  const copyClipping = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Copiar clipping em Markdown
  const copyMarkdown = useCallback(
    async (clipping: ClippingResponse) => {
      if (!book) return;
      const type = clippingTypeLabel(clipping.type);
      const date = formatDate(clipping.kindleDate);
      const md = `> ${clipping.content}\n\n- Tipo: ${type}\n- Livro: ${book.title} (${book.author})\n- Data: ${date}`;
      await navigator.clipboard.writeText(md);
      setCopiedMdId(clipping.id);
      setTimeout(() => setCopiedMdId(null), 2000);
    },
    [book],
  );

  // Copiar todos os clippings
  const copyAllClippings = useCallback(async () => {
    if (!book || clippings.length === 0) return;
    const text = clippings
      .map((c) => {
        const type = clippingTypeLabel(c.type);
        const date = formatDate(c.kindleDate);
        return `> ${c.content}\n\n- ${type} | ${book.title} — ${book.author} | ${date}\n`;
      })
      .join('\n---\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [book, clippings]);

  if (isLoading) return <PageSpinner />;
  if (isError || !book) {
    return (
      <ErrorState
        title="Erro ao carregar livro"
        message="Não foi possível carregar os dados deste livro."
        onRetry={() => refetch()}
      />
    );
  }

  const typeOptions = ['todos', 'destaque', 'nota', 'marcador'];

  return (
    <div>
      {/* Header do livro */}
      <div className="mb-8">
        <a href="/books" className="body-sm text-primary hover:underline mb-4 inline-block">
          ← Voltar para livros
        </a>

        <div className="flex gap-6 mt-2">
          {/* Capa do livro */}
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Capa de ${book.title}`}
              className="w-28 h-40 object-cover rounded-sm flex-shrink-0 bg-neutral/30 hidden sm:block"
            />
          ) : (
            <div className="w-28 h-40 flex-shrink-0 rounded-sm bg-neutral/20 hidden sm:flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-muted/40" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-1">
            <div>
              <h1 className="headline-display text-text">{book.title}</h1>
              <p className="headline-sm text-muted mt-1">{book.author}</p>
              <p className="body-sm text-muted mt-2">
                {book.clippingCount} {book.clippingCount === 1 ? 'clipping' : 'clippings'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={copyAllClippings}
                disabled={clippings.length === 0}
              >
                {copiedAll ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedAll ? 'Copiado!' : 'Copiar todos'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowMarkdownPreview(true);
                  refetchMarkdown();
                }}
              >
                <Eye className="h-4 w-4" />
                Visualizar Markdown
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download(bookId, book.title)}>
                <Download className="h-4 w-4" />
                Baixar Markdown
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar nos clippings..."
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 body-md bg-surface border border-neutral rounded-sm text-on-surface placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Buscar nos clippings"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="body-md bg-surface border border-neutral rounded-sm px-3 py-2 text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Filtrar por tipo"
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'todos' ? 'Todos os tipos' : clippingTypeLabel(opt)}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'date-desc' ? 'date-asc' : 'date-desc')}
            className="flex items-center gap-1.5"
            aria-label="Alternar ordenação"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'date-desc' ? 'Mais recentes' : 'Mais antigos'}
          </Button>

          <Button
            variant={favoritesOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className="flex items-center gap-1.5"
            aria-label={favoritesOnly ? 'Mostrar todos' : 'Mostrar apenas favoritos'}
          >
            <Heart className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
            Favoritos
          </Button>
        </div>
      </Card>

      {/* Loading */}
      {clipsLoading && <PageSpinner />}

      {/* Error */}
      {clipsError && (
        <ErrorState
          title="Erro ao carregar clippings"
          message="Não foi possível carregar os clippings deste livro."
          onRetry={() => refetchClips()}
        />
      )}

      {/* Empty filtered */}
      {!clipsLoading && !clipsError && clippings.length === 0 && (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="Nenhum clipping encontrado"
          description="Nenhum clipping corresponde aos filtros aplicados."
        />
      )}

      {/* Lista de clippings */}
      {!clipsLoading && !clipsError && clippings.length > 0 && (
        <div className="flex flex-col gap-4">
          {clippings.map((clipping) => (
            <Card key={clipping.id} className="relative">
              {/* Quote block */}
              <blockquote className="border-l-4 border-primary/30 pl-4 mb-4">
                <p className="body-md text-on-surface whitespace-pre-wrap">{clipping.content}</p>
              </blockquote>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Chip label={clippingTypeLabel(clipping.type)} />
                {clipping.page && <span className="body-sm text-muted">Pág. {clipping.page}</span>}
                {clipping.locationStart > 0 && (
                  <span className="body-sm text-muted">
                    Loc. {clipping.locationStart}
                    {clipping.locationEnd !== clipping.locationStart && `-${clipping.locationEnd}`}
                  </span>
                )}
                <span className="body-sm text-muted">{formatDate(clipping.kindleDate)}</span>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyClipping(clipping.id, clipping.content)}
                >
                  {copiedId === clipping.id ? (
                    <CopyCheck className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedId === clipping.id ? 'Copiado' : 'Copiar'}
                </Button>

                <Button variant="secondary" size="sm" onClick={() => copyMarkdown(clipping)}>
                  {copiedMdId === clipping.id ? (
                    <CopyCheck className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {copiedMdId === clipping.id ? 'Copiado' : 'Copiar Markdown'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.open(`/quotes/${bookId}/${clipping.id}`, '_blank');
                  }}
                >
                  <Image className="h-4 w-4" />
                  Gerar imagem
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setTogglingFavorite(clipping.id);
                    toggleFavorite.mutate(
                      { bookId, clipId: clipping.id },
                      { onSettled: () => setTogglingFavorite(null) },
                    );
                  }}
                  disabled={togglingFavorite === clipping.id}
                  aria-label={
                    favoritedIds.has(clipping.id) ? 'Remover favorito' : 'Adicionar favorito'
                  }
                  title={favoritedIds.has(clipping.id) ? 'Remover favorito' : 'Adicionar favorito'}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favoritedIds.has(clipping.id) ? 'fill-red-500 text-red-500' : ''
                    } ${togglingFavorite === clipping.id ? 'animate-pulse' : ''}`}
                  />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de visualização Markdown */}
      {showMarkdownPreview && (
        <MarkdownPreview
          content={markdownContent}
          loading={markdownLoading}
          error={markdownError}
          onClose={() => setShowMarkdownPreview(false)}
          onRetry={() => refetchMarkdown()}
        />
      )}
    </div>
  );
}
