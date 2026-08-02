import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLAttributes, forwardRef } from 'react';

const cardVariants = cva('bg-surface rounded-lg border border-neutral p-6', {
  variants: {
    variant: {
      default: '',
      interactive: 'hover:ring-2 hover:ring-primary/20 transition-shadow cursor-pointer',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />;
  },
);

Card.displayName = 'Card';
