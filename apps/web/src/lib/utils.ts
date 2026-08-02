import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina classes CSS com suporte a Tailwind merge */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formata data ISO 8601 para exibição local (pt-BR) */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Nome amigável para o tipo de clipping */
export function clippingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    destaque: 'Destaque',
    nota: 'Nota',
    marcador: 'Marcador',
  };
  return labels[type] ?? type;
}
