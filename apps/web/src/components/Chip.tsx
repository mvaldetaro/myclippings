import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
}

/**
 * Chip para exibir tipo de clipping.
 * DESIGN.md: bg-[#F3F0E1], text-on-surface, rounded-full, px-2.5 py-1, text-sm.
 */
export function Chip({ label, className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center bg-[#F3F0E1] text-on-surface rounded-full px-2.5 py-1 text-xs',
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
