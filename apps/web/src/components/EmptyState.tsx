import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Estado vazio centralizado com ícone, título, descrição e ação opcional */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-16 px-8 max-w-md mx-auto">
      <div className="text-muted mb-4">{icon ?? <BookOpen className="h-12 w-12" />}</div>
      <h3 className="headline-md text-on-surface mb-2">{title}</h3>
      <p className="body-md text-muted mb-6">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Card>
  );
}
