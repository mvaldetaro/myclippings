import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './Button';

interface MarkdownPreviewProps {
  /** Conteúdo Markdown a ser renderizado */
  content: string | undefined;
  /** Indica se está carregando */
  loading: boolean;
  /** Indica se houve erro ao carregar */
  error: boolean;
  /** Callback para fechar o modal */
  onClose: () => void;
  /** Callback para tentar novamente após erro */
  onRetry: () => void;
}

export function MarkdownPreview({
  content,
  loading,
  error,
  onClose,
  onRetry,
}: MarkdownPreviewProps) {
  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-surface rounded-lg border border-neutral w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral">
          <h2 className="headline-md text-text">Visualização Markdown</h2>
          <Button variant="tertiary" size="sm" onClick={onClose} aria-label="Fechar visualização">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
              <span className="ml-3 body-md text-muted">Carregando Markdown…</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-8 w-8 text-error" />
              <p className="body-md text-muted">Erro ao carregar o Markdown.</p>
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!loading && !error && content && (
            <div className="prose prose-sm max-w-none text-on-surface">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-neutral">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
