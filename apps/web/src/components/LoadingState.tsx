import { cn } from '@/lib/utils';

/** Skeleton shimmer para card de livro */
export function BookCardSkeleton() {
  return (
    <div className="bg-surface rounded-lg border border-neutral p-6 animate-pulse">
      <div className="h-5 bg-neutral/50 rounded w-3/4 mb-3" />
      <div className="h-4 bg-neutral/30 rounded w-1/2 mb-4" />
      <div className="flex gap-2">
        <div className="h-5 bg-neutral/30 rounded-full w-16" />
        <div className="h-5 bg-neutral/30 rounded-full w-12" />
      </div>
    </div>
  );
}

/** Grid de skeletons para página de listagem de livros */
export function BookListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={`skeleton-${String(i)}`} />
      ))}
    </div>
  );
}

/** Skeleton inline para texto */
export function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-neutral/40 rounded', className)} aria-hidden="true" />
  );
}

/** Spinner de carregamento centralizado na página */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20" aria-label="Carregando...">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
