import { Link, createFileRoute } from '@tanstack/react-router';
import { AlertCircle, CheckCircle, FileText, Upload, XCircle } from 'lucide-react';
import { type DragEvent, useCallback, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { ApiError } from '../lib/api';
import { useImport } from '../queries/imports';

export const Route = createFileRoute('/import')({
  component: ImportPage,
});

function ImportPage() {
  const importMutation = useImport();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const result = importMutation.data;

  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    // Valida extensão .txt
    if (!selectedFile.name.endsWith('.txt')) {
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile ?? null);
    },
    [handleFile],
  );

  const handleUpload = () => {
    if (!file) return;
    importMutation.mutate(file);
  };

  const handleReset = () => {
    setFile(null);
    importMutation.reset();
  };

  // Erro de upload
  if (importMutation.isError && !result) {
    const err = importMutation.error;
    const message = err instanceof ApiError ? err.message : 'Erro ao processar o arquivo.';
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorState title="Erro na importação" message={message} onRetry={handleReset} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="headline-display text-text mb-2">Importar Clippings</h1>
      <p className="body-md text-muted mb-8">
        Envie seu arquivo My Clippings.txt exportado do Kindle.
      </p>

      {/* Upload area */}
      {!result && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-neutral'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-12 w-12 text-muted mb-4" />

            {file ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 body-md text-on-surface">
                  <FileText className="h-5 w-5 text-primary" />
                  {file.name}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" size="sm" onClick={() => setFile(null)}>
                    Remover
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpload}
                    loading={importMutation.isPending}
                  >
                    Importar arquivo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="headline-sm text-on-surface mb-2">Arraste e solte seu arquivo aqui</p>
                <p className="body-md text-muted mb-4">ou</p>
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary bg-surface text-[#333] border border-border rounded-sm hover:bg-neutral/30 h-9 px-2.5 py-1.5 text-xs">
                  Selecionar arquivo
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="body-sm text-muted mt-4">Apenas arquivos .txt (My Clippings.txt)</p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Loading durante upload */}
      {importMutation.isPending && (
        <Card className="mt-6 text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="headline-sm text-on-surface">Processando arquivo...</p>
          <p className="body-md text-muted mt-2">Isso pode levar alguns instantes.</p>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card className="mt-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h2 className="headline-md text-on-surface">Importação concluída</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              label="Total de registros"
              value={result.totalRecords}
              icon={<FileText className="h-5 w-5" />}
              color="text-on-surface"
            />
            <StatCard
              label="Importados (novos)"
              value={result.importedRecords}
              icon={<CheckCircle className="h-5 w-5" />}
              color="text-primary"
            />
            <StatCard
              label="Duplicados (ignorados)"
              value={result.duplicateRecords}
              icon={<AlertCircle className="h-5 w-5" />}
              color="text-tertiary"
            />
            <StatCard
              label="Inválidos"
              value={result.invalidRecords}
              icon={<XCircle className="h-5 w-5" />}
              color="text-error"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/books">
              <Button variant="primary">Ver livros</Button>
            </Link>
            <Button variant="secondary" onClick={handleReset}>
              Importar outro arquivo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Card de estatística do resultado */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-surface rounded-md border border-neutral p-3">
      <div className={`flex items-center gap-1.5 ${color} mb-1`}>
        {icon}
        <span className="body-sm text-muted">{label}</span>
      </div>
      <p className={`headline-sm ${color}`}>{value}</p>
    </div>
  );
}
