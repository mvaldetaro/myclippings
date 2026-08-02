import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { BookListSkeleton } from '../../components/LoadingState';
import { clippingTypeLabel, formatDate } from '../../lib/utils';
import { useBooks } from '../../queries/books';
import type { BookListItem } from '../../queries/books';

export const Route = createFileRoute('/books/')({
  component: BooksPage,
});

function BooksPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useBooks(search || undefined);

  const books = data?.books ?? [];

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="headline-display text-text">Seus Livros</h1>
          <div className="w-full sm:w-64">
            <div className="h-10 bg-neutral/30 rounded-sm animate-pulse" />
          </div>
        </div>
        <BookListSkeleton count={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12">
        <ErrorState
          message="Não foi possível carregar seus livros. Verifique sua conexão."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header com busca */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="headline-display text-text">Seus Livros</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 body-md bg-surface border border-neutral rounded-sm text-on-surface placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Buscar livros"
          />
        </div>
      </div>

      {/* Estado vazio */}
      {books.length === 0 && !search && (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="Nenhum livro encontrado"
          description="Importe seu arquivo My Clippings.txt para começar a organizar seus destaques do Kindle."
          action={{
            label: 'Importar arquivo',
            onClick: () => navigate({ to: '/import' }),
          }}
        />
      )}

      {/* Estado vazio com busca */}
      {books.length === 0 && search && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Nenhum resultado"
          description={`Nenhum livro encontrado para "${search}".`}
        />
      )}

      {/* Grid de livros */}
      {books.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onClick={() =>
                navigate({
                  to: '/books/$bookId',
                  params: { bookId: book.id },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Card individual de livro */
function BookCard({ book, onClick }: { book: BookListItem; onClick: () => void }) {
  // Extraímos os tipos de clipping dos metadados
  const clippingTypes = ['destaque', 'nota', 'marcador'] as const;

  return (
    <Card
      variant="interactive"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      aria-label={`${book.title} de ${book.author}`}
    >
      <div className="flex flex-col h-full">
        {/* Título */}
        <h2 className="headline-md text-on-surface mb-1 line-clamp-2">{book.title}</h2>

        {/* Autor */}
        <p className="body-md text-muted mb-4">{book.author}</p>

        {/* Chips de tipo */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {clippingTypes.map((type) => (
            <Chip key={type} label={clippingTypeLabel(type)} />
          ))}
        </div>

        {/* Metadados e ação */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="body-sm text-muted">
              {book.clippingCount} {book.clippingCount === 1 ? 'clipping' : 'clippings'}
            </span>
            <span className="body-sm text-muted">{formatDate(book.updatedAt)}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </div>
      </div>
    </Card>
  );
}
