import type { Page } from '@playwright/test';

/**
 * Helper functions para os testes E2E do MyClippings.
 *
 * Todos os seletores foram extraídos da leitura direta dos componentes
 * React em apps/web/src/routes/ e apps/web/src/components/.
 *
 * O componente Input gera o id a partir do label:
 *   id = label.toLowerCase().replace(/\s+/g, '-')
 * Exemplos:
 *   "E-mail"           → id="e-mail"
 *   "Senha"            → id="senha"
 *   "Nome"             → id="nome"
 *   "Confirmar senha"   → id="confirmar-senha"
 */

/** Credenciais padrão para o usuário de teste */
export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/** Gera um usuário de teste com email único (timestamp) */
export function createTestUser(): TestUser {
  const ts = Date.now();
  return {
    name: 'Usuário Teste',
    email: `test-e2e-${ts}@example.com`,
    password: 'Teste@1234',
  };
}

/**
 * Aguarda a página carregar completamente:
 * - Espera pelo conteúdo principal (main#main-content)
 * - Aguarda network idle
 * - Aguarda não haver spinners visíveis
 */
export async function waitForLoad(page: Page): Promise<void> {
  await page.waitForSelector('#main-content', { state: 'visible' });
  await page.waitForLoadState('networkidle');
  // Aguarda spinners sumirem se houver
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {
        // Spinner pode nunca aparecer — ok
      });
  }
}

/**
 * Registra um novo usuário via UI.
 *
 * Fluxo:
 *  1. Navega para /register
 *  2. Preenche Nome, E-mail, Senha, Confirmar senha
 *  3. Submete o formulário
 *  4. NOTA: A API de registro (201) NÃO emite cookie JWT.
 *     A UI navega para /books → /books retorna 401 → redireciona para /login.
 *     Este helper não espera por URL específica — o chamador deve lidar com isso.
 */
export async function registerUser(
  page: Page,
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/register');
  await waitForLoad(page);

  // Preenche os campos — ids gerados pelo componente Input a partir dos labels
  await page.locator('#nome').fill(name);
  await page.locator('#e-mail').fill(email);
  await page.locator('#senha').fill(password);
  await page.locator('#confirmar-senha').fill(password);

  // Submete o formulário
  await page.getByRole('button', { name: 'Criar conta' }).click();

  // Aguarda a navegação disparada pelo onSuccess (pode ser /books → /login)
  // Não esperamos URL específica — o fluxo termina em /login
  await page.waitForLoadState('networkidle');
}

/**
 * Faz login via UI.
 *
 * Fluxo:
 *  1. Navega para /login
 *  2. Preenche E-mail e Senha
 *  3. Submete o formulário
 *  4. Aguarda redirecionamento para /books
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await waitForLoad(page);

  await page.locator('#e-mail').fill(email);
  await page.locator('#senha').fill(password);

  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL(/\/books/, { timeout: 10000 });
  await waitForLoad(page);
}

/**
 * Faz upload do arquivo My Clippings.txt via UI.
 *
 * Fluxo:
 *  1. Navega para /import
 *  2. Localiza o input[type=file] (hidden) e seta o arquivo
 *  3. Clica em "Importar arquivo"
 *  4. Aguarda o resultado da importação (card "Importação concluída")
 *
 * O componente ImportPage renderiza um input file hidden dentro de um label.
 * Playwright consegue interagir com inputs hidden via setInputFiles.
 */
export async function uploadClippings(page: Page, filePath: string): Promise<void> {
  await page.goto('/import');
  await waitForLoad(page);

  // O input file está hidden dentro do label "Selecionar arquivo"
  const fileInput = page.locator('input[type="file"][accept=".txt"]');
  await fileInput.setInputFiles(filePath);

  // Aguarda o botão "Importar arquivo" aparecer (após seleção do arquivo)
  await page.getByRole('button', { name: 'Importar arquivo' }).click();

  // Aguarda o card de resultado "Importação concluída"
  await page.getByText('Importação concluída').waitFor({ state: 'visible', timeout: 15000 });
}
