import { createFileRoute, useParams } from '@tanstack/react-router';
import { Download, Palette } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Input } from '../../components/Input';
import { PageSpinner } from '../../components/LoadingState';
import { useBook } from '../../queries/books';
import { useClipping } from '../../queries/clippings';
import { downloadQuoteImage, getQuoteImageUrl } from '../../queries/quotes';

export const Route = createFileRoute('/quotes/$bookId/$clipId')({
  component: QuotePage,
});

function QuotePage() {
  const params = useParams({ from: '/quotes/$bookId/$clipId' });
  const bookId = params.bookId;
  const clipId = params.clipId;

  const { data: bookData, isLoading: bookLoading } = useBook(bookId);
  const { data: clipping, isLoading: clipLoading } = useClipping(bookId, clipId);

  // Configurações locais de preview (a imagem é gerada server-side com
  // as preferências salvas do usuário; aqui só controlamos a visualização)
  const [backgroundColor, setBackgroundColor] = useState('#00635D');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [showAuthor, setShowAuthor] = useState(true);
  const [showBookTitle, setShowBookTitle] = useState(true);

  const isLoading = bookLoading || clipLoading;

  if (isLoading) return <PageSpinner />;

  if (!clipping) {
    return (
      <ErrorState
        title="Clipping não encontrado"
        message="Este clipping não existe ou foi removido."
      />
    );
  }

  const imageUrl = getQuoteImageUrl(bookId, clipId);

  return (
    <div className="max-w-2xl mx-auto">
      <a
        href={`/books/${bookId}`}
        className="body-sm text-primary hover:underline mb-4 inline-block"
      >
        ← Voltar para o livro
      </a>

      <h1 className="headline-display text-text mb-6">Imagem da Citação</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview */}
        <div>
          <Card className="p-4 flex items-center justify-center" style={{ backgroundColor }}>
            <img
              src={imageUrl}
              alt="Preview da citação"
              className="max-w-full h-auto rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </Card>

          <div className="mt-4">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => downloadQuoteImage(bookId, clipId)}
            >
              <Download className="h-4 w-4" />
              Baixar imagem (PNG)
            </Button>
          </div>
        </div>

        {/* Configurações */}
        <div>
          <Card>
            <h2 className="headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Configurações
            </h2>

            <p className="body-sm text-muted mb-4">
              Estas são suas preferências visuais salvas. Altere-as em Configurações.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="quote-bg-color" className="label-md text-on-surface block mb-1.5">
                  Cor de fundo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="quote-bg-color"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded-sm border border-neutral cursor-pointer"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                    aria-label="Cor de fundo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="quote-text-color" className="label-md text-on-surface block mb-1.5">
                  Cor do texto
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="quote-text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded-sm border border-neutral cursor-pointer"
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1"
                    aria-label="Cor do texto"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAuthor}
                  onChange={(e) => setShowAuthor(e.target.checked)}
                  className="rounded-sm"
                />
                <span className="body-md text-on-surface">Mostrar autor</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBookTitle}
                  onChange={(e) => setShowBookTitle(e.target.checked)}
                  className="rounded-sm"
                />
                <span className="body-md text-on-surface">Mostrar título do livro</span>
              </label>
            </div>
          </Card>

          {/* Metadados do clipping */}
          <Card className="mt-4">
            <h3 className="label-lg text-muted mb-2">Citação original</h3>
            <blockquote className="border-l-4 border-primary/30 pl-4 mb-3">
              <p className="body-md text-on-surface whitespace-pre-wrap">{clipping.content}</p>
            </blockquote>
            {bookData?.book && (
              <p className="body-sm text-muted">
                {bookData.book.title} — {bookData.book.author}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
