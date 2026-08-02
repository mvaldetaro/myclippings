import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E do MyClippings.
 *
 * Requisitos:
 * - Serviços docker compose devem estar rodando (app web + nginx + API)
 * - Iniciar manualmente: `docker compose up -d`
 * - Variável de ambiente WEB_APP_URL define a baseURL (default: http://localhost:3000)
 * - No macOS, o app web roda em http://localhost:3000 via docker compose
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  timeout: 30000,
  expect: {
    timeout: 10000,
  },
});
