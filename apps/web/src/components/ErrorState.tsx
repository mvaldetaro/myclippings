import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Estado de erro com mensagem e botão de tentar novamente */
export function ErrorState({
  title = 'Erro ao carregar',
  message = 'Ocorreu um erro inesperado. Tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-12 px-8 max-w-md mx-auto border-error/30">
      <AlertTriangle className="h-10 w-10 text-error mb-3" />
      <h3 className="headline-md text-on-surface mb-2">{title}</h3>
      <p className="body-md text-muted mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Card>
  );
}
