import { createFileRoute } from '@tanstack/react-router';
import { Layout, Palette, RotateCcw } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Input } from '../components/Input';
import { PageSpinner } from '../components/LoadingState';
import { useSettings, useUpdateSettings } from '../queries/settings';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading, isError, refetch } = useSettings();
  const updateSettings = useUpdateSettings();

  const APP_DEFAULTS = {
    backgroundColor: '#00635D',
    textColor: '#FFFFFF',
    showAuthor: true,
    showBookTitle: true,
  } as const;

  // Preferências de citação
  const [backgroundColor, setBackgroundColor] = useState(APP_DEFAULTS.backgroundColor);
  const [textColor, setTextColor] = useState(APP_DEFAULTS.textColor);
  const [showAuthor, setShowAuthor] = useState(APP_DEFAULTS.showAuthor);
  const [showBookTitle, setShowBookTitle] = useState(APP_DEFAULTS.showBookTitle);

  // Sincroniza com dados do servidor
  useEffect(() => {
    if (data) {
      setBackgroundColor(data.quotePreferences.backgroundColor);
      setTextColor(data.quotePreferences.textColor);
      setShowAuthor(data.quotePreferences.showAuthor);
      setShowBookTitle(data.quotePreferences.showBookTitle);
    }
  }, [data]);

  const [saved, setSaved] = useState(false);

  const handleSaveQuotes = (e: FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(
      {
        quotePreferences: {
          backgroundColor,
          textColor,
          showAuthor,
          showBookTitle,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  };

  const handleResetDefaults = () => {
    setBackgroundColor(APP_DEFAULTS.backgroundColor);
    setTextColor(APP_DEFAULTS.textColor);
    setShowAuthor(APP_DEFAULTS.showAuthor);
    setShowBookTitle(APP_DEFAULTS.showBookTitle);

    updateSettings.mutate(
      { quotePreferences: { ...APP_DEFAULTS } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  };

  if (isLoading) return <PageSpinner />;
  if (isError) {
    return (
      <ErrorState
        title="Erro ao carregar configurações"
        message="Não foi possível carregar suas preferências."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="headline-display text-text mb-2">Configurações</h1>
      <p className="body-md text-muted mb-8">
        Gerencie suas preferências de interface e geração de imagens.
      </p>

      {/* Interface preferences */}
      <Card className="mb-6">
        <h2 className="headline-sm text-on-surface mb-4 flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Preferências de interface
        </h2>
        <p className="body-sm text-muted">
          As opções de interface estarão disponíveis em uma versão futura.
        </p>
      </Card>

      {/* Quote preferences */}
      <Card>
        <h2 className="headline-sm text-on-surface mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Preferências de citação
        </h2>

        <p className="body-sm text-muted mb-6">
          Configure como suas imagens de citação serão geradas.
        </p>

        <form onSubmit={handleSaveQuotes} className="flex flex-col gap-4">
          <div>
            <label htmlFor="settings-bg-color" className="label-md text-on-surface block mb-1.5">
              Cor de fundo
            </label>
            <div className="flex items-center gap-2">
              <input
                id="settings-bg-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded-sm border border-neutral cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1"
                aria-label="Valor da cor de fundo"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-text-color" className="label-md text-on-surface block mb-1.5">
              Cor do texto
            </label>
            <div className="flex items-center gap-2">
              <input
                id="settings-text-color"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 rounded-sm border border-neutral cursor-pointer"
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1"
                aria-label="Valor da cor do texto"
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

          <div className="flex items-center gap-3 mt-2">
            <Button type="submit" variant="primary" loading={updateSettings.isPending}>
              Salvar preferências
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetDefaults}
              loading={updateSettings.isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Redefinir para padrões
            </Button>
            {saved && <span className="body-sm text-primary">Salvo com sucesso!</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
