import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BookOpen, Heart } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PageSpinner } from '../../components/LoadingState';
import { clippingTypeLabel, formatDate } from '../../lib/utils';
import { useBooks } from '../../queries/books';
import { useFavoriteClippings, useToggleFavorite } from '../../queries/clippings';
import type { FavoriteClippingResponse } from '../../queries/clippings';

export const Route = createFileRoute('/favorites/')({
  component: FavoritesPage,
});

function FavoritesPage() {
  const navigate = useNavigate();
  const [bookFilter, setBookFilter] = useState<string>('');
  const {
    data: favoritesData,
    isLoading,
    isError,
    refetch,
  } = useFavoriteClippings(bookFilter || undefined);
  const { data: booksData } = useBooks();
  const toggleFavorite = useToggleFavorite();

  const favorites = favoritesData?.favorites ?? [];
  const books = booksData?.books ?? [];

  if (isLoading) return <PageSpinner />;

  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar favoritos"
        message="Não foi possível carregar seus favoritos."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="headline-display text-text flex items-center gap-2">
          <Heart className="h-7 w-7 text-red-500 fill-red-500" />
          Favoritos
        </h1>

        <select
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          className="body-md bg-surface border border-neutral rounded-sm px-3 py-2 text-on-surface focus-visible:outline-2 focus-visible:outline-primary w-full sm:w-64"
          aria-label="Filtrar por livro"
        >
          <option value="">Todos os livros</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title} — {book.author}
            </option>
          ))}
        </select>
      </div>

      {favorites.length === 0 && (
        <EmptyState
          icon={<Heart className="h-12 w-12" />}
          title="Nenhum favorito"
          description={
            bookFilter
              ? 'Nenhum clipping favorito neste livro.'
              : 'Marque clippings como favoritos para encontrá-los aqui rapidamente.'
          }
          action={
            bookFilter
              ? undefined
              : {
                  label: 'Ver livros',
                  onClick: () => navigate({ to: '/books' }),
                }
          }
        />
      )}

      {favorites.length > 0 && (
        <div className="flex flex-col gap-4">
          {favorites.map((fav) => (
            <FavoriteCard
              key={`${fav.bookId}-${fav.id}`}
              favorite={fav}
              onUnfavorite={() => toggleFavorite.mutate({ bookId: fav.bookId, clipId: fav.id })}
              onNavigateBook={() =>
                navigate({ to: '/books/$bookId', params: { bookId: fav.bookId } })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  favorite,
  onUnfavorite,
  onNavigateBook,
}: {
  favorite: FavoriteClippingResponse;
  onUnfavorite: () => void;
  onNavigateBook: () => void;
}) {
  return (
    <Card>
      <blockquote className="border-l-4 border-primary/30 pl-4 mb-4">
        <p className="body-md text-on-surface whitespace-pre-wrap">{favorite.content}</p>
      </blockquote>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Chip label={clippingTypeLabel(favorite.type)} />
        {favorite.page && <span className="body-sm text-muted">Pág. {favorite.page}</span>}
        {favorite.locationStart > 0 && (
          <span className="body-sm text-muted">
            Loc. {favorite.locationStart}
            {favorite.locationEnd !== favorite.locationStart && `-${favorite.locationEnd}`}
          </span>
        )}
        <span className="body-sm text-muted">{formatDate(favorite.kindleDate)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onNavigateBook}
          className="body-sm text-primary hover:underline flex items-center gap-1"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {favorite.bookTitle} — {favorite.bookAuthor}
        </button>

        <Button variant="secondary" size="sm" onClick={onUnfavorite}>
          <Heart className="h-4 w-4 fill-current text-red-500" />
          Remover favorito
        </Button>
      </div>
    </Card>
  );
}
