import { env } from './config/env';
import { createApp } from './app';
import { getDb } from './lib/db';
import { runStartupTasks } from './startup';

/**
 * Entry point do servidor API.
 *
 * Fluxo de inicialização (ARCHITECTURE §8.4):
 * 1. Valida variáveis obrigatórias
 * 2. Verifica acesso ao SQLite
 * 3. Aplica migrations
 * 4. Detecta arquivos temporários abandonados
 * 5. Reconstrói/reindexa file_index
 * 6. Inicia o servidor HTTP
 */
async function main() {
  // Inicializa o banco de dados (valida conexão e aplica migrations)
  const db = getDb();

  // Cria a aplicação Fastify
  const app = await createApp();

  // Executa tarefas de inicialização (index rebuild, temp file cleanup)
  await runStartupTasks(app.log, db);

  // Inicia o servidor
  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info({ address }, 'Servidor API iniciado');
  } catch (err) {
    app.log.error({ err }, 'Falha ao iniciar o servidor');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Recebido sinal de encerramento');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Falha fatal na inicialização:', err);
  process.exit(1);
});
