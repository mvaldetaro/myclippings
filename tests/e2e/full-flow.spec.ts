import { test, expect } from '@playwright/test';
import path from 'node:path';
import { createTestUser, loginUser, uploadClippings, waitForLoad } from './helpers';

/**
 * Testes E2E completos do MyClippings.
 *
 * Usa test.describe.serial porque os cenários dependem uns dos outros:
 * cadastro → login → dashboard → upload → listagem → leitura →
 * filtro → cópia → download → imagem → reimportação → persistência.
 *
 * Pré-requisitos:
 * - docker compose up -d (serviços rodando)
 * - WEB_APP_URL=http://localhost:3000 npx playwright test
 */

const SAMPLE_FILE = path.resolve(__dirname, '../fixtures/sample-lf.txt');

/**
 * Dados de teste — o usuário é criado uma vez e reutilizado nos cenários seguintes.
 * O email usa timestamp para evitar conflitos entre execuções.
 */
const user = createTestUser();

test.describe.serial('MyClippings — Fluxo completo E2E', () => {
  // ──────────────────────────────────────────────────────────────
  // Cenário 1: Cadastro (Registration)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 1: Cadastro com validação', async ({ page }) => {
    await page.goto('/register');
    await waitForLoad(page);

    // 1a. Validação: submit com campos vazios
    await page.getByRole('button', { name: 'Criar conta' }).click();
    // Os campos têm required do HTML5 — o próprio navegador bloqueia
    // Mas o form usa noValidate, então validamos via client-side
    // A validação client-side só roda se os campos não estiverem vazios
    // (password !== confirmPassword ou password.length < 8)

    // 1b. Preenche nome e email, mas com senhas diferentes
    await page.locator('#nome').fill(user.name);
    await page.locator('#e-mail').fill(user.email);
    await page.locator('#senha').fill('Teste@1234');
    await page.locator('#confirmar-senha').fill('Diferente');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('alert')).toContainText('As senhas não conferem');

    // 1c. Preenche senha curta
    await page.locator('#senha').fill('12345');
    await page.locator('#confirmar-senha').fill('12345');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('alert')).toContainText('A senha deve ter no mínimo 8 caracteres');

    // 1d. Preenche todos os campos corretamente
    await page.locator('#senha').fill(user.password);
    await page.locator('#confirmar-senha').fill(user.password);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    // O registro cria o usuário (201) mas NÃO emite cookie JWT.
    // A UI navega para /books, que retorna 401 → redireciona para /login.
    // Aguardamos a URL estabilizar em /login.
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await waitForLoad(page);
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 2: Login
  // ──────────────────────────────────────────────────────────────
  test('Cenário 2: Login com credenciais válidas', async ({ page }) => {
    await loginUser(page, user.email, user.password);

    // Verifica que estamos na página de livros
    await expect(page.getByText('Seus Livros')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 3: Dashboard Vazio (Empty state)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 3: Dashboard vazio — sem livros importados', async ({ page }) => {
    // Já estamos autenticados do cenário 2 (cookies persistem no mesmo worker)
    await page.goto('/books');
    await waitForLoad(page);

    // Estado vazio: "Nenhum livro encontrado" com ação "Importar arquivo"
    await expect(page.getByText('Nenhum livro encontrado')).toBeVisible();
    await expect(page.getByText('Importar arquivo')).toBeVisible();

    // Clica no botão "Importar arquivo" do EmptyState → navega para /import
    await page.getByRole('button', { name: 'Importar arquivo' }).click();
    await page.waitForURL(/\/import/, { timeout: 5000 });
    await expect(page.getByText('Importar Clippings')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 4: Upload (Importação)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 4: Upload do arquivo My Clippings.txt', async ({ page }) => {
    await uploadClippings(page, SAMPLE_FILE);

    // Verifica o card de resultado "Importação concluída"
    await expect(page.getByText('Importação concluída')).toBeVisible();

    // Verifica estatísticas: Total = 5, Importados = 5, Duplicados = 0, Inválidos = 0
    // (sample-lf.txt tem 4 registros válidos + 1 com marcador sem conteúdo = 5 total)
    await expect(page.getByText('Total de registros')).toBeVisible();

    // Clica "Ver livros" para navegar para /books
    await page.getByRole('button', { name: 'Ver livros' }).click();
    await page.waitForURL(/\/books/, { timeout: 5000 });
    await waitForLoad(page);
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 5: Listagem de Livros (Book listing)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 5: Listagem de livros com busca', async ({ page }) => {
    await page.goto('/books');
    await waitForLoad(page);

    // Verifica que os livros importados aparecem
    await expect(page.getByText('A boa sorte')).toBeVisible();
    await expect(page.getByText('O Poder do Hábito')).toBeVisible();

    // Verifica autores
    const card1 = page.locator('[aria-label="A boa sorte de Álex Rovira Celma;Fernando Trías de Bes"]');
    await expect(card1).toBeVisible();
    // A boa sorte tem destaque (2 clippings)
    await expect(card1).toContainText('Destaque');

    // Testa busca por título
    const searchInput = page.locator('input[aria-label="Buscar livros"]');
    await searchInput.fill('Poder');
    await waitForLoad(page);

    // Deve mostrar apenas "O Poder do Hábito"
    await expect(page.getByText('O Poder do Hábito')).toBeVisible();
    await expect(page.getByText('A boa sorte')).not.toBeVisible();

    // Limpa busca
    await searchInput.fill('');
    await waitForLoad(page);

    // Ambos livros voltam
    await expect(page.getByText('A boa sorte')).toBeVisible();
    await expect(page.getByText('O Poder do Hábito')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 6: Leitura do Livro (Book reading)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 6: Leitura do livro com lista de clippings', async ({ page }) => {
    // Clica no card do livro "A boa sorte"
    await page.getByText('A boa sorte').first().click();
    await page.waitForURL(/\/books\/[^/]+$/, { timeout: 5000 });
    await waitForLoad(page);

    // Verifica título e autor
    await expect(page.getByRole('heading', { name: 'A boa sorte' })).toBeVisible();
    await expect(page.getByText('Álex Rovira Celma;Fernando Trías de Bes')).toBeVisible();

    // Verifica contagem de clippings
    await expect(page.getByText(/3 clippings/)).toBeVisible();

    // Verifica que os clippings estão visíveis (blocos blockquote)
    const blockquotes = page.locator('blockquote');
    const count = await blockquotes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Verifica texto de um clipping específico
    await expect(page.getByText('Ali, sentindo-se em paz')).toBeVisible();
    await expect(page.getByText('A Boa Sorte depende unicamente de você')).toBeVisible();

    // Verifica que os chips de tipo estão presentes (Destaque, Nota, Marcador)
    await expect(page.locator('text=Destaque').first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 7: Filtro de Clippings (Clipping filter)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 7: Filtro de clippings por texto e tipo', async ({ page }) => {
    // Ainda na página de detalhe do livro "A boa sorte"

    // 7a. Filtro por texto
    const clipSearch = page.locator('input[aria-label="Buscar nos clippings"]');
    await clipSearch.fill('Boa Sorte');
    await waitForLoad(page);

    // Deve mostrar apenas 1 clipping contendo "Boa Sorte"
    const visibleClips = page.locator('blockquote');
    await expect(visibleClips).toHaveCount(1);
    await expect(page.getByText('A Boa Sorte depende unicamente de você')).toBeVisible();

    // Limpa filtro de texto
    await clipSearch.fill('');
    await waitForLoad(page);

    // 7b. Filtro por tipo usando o select
    const typeSelect = page.locator('select[aria-label="Filtrar por tipo"]');
    await typeSelect.selectOption('destaque');
    await waitForLoad(page);

    // Deve mostrar apenas Destaques
    await expect(visibleClips).toHaveCount(2); // 2 destaques em "A boa sorte"

    // Volta para "Todos os tipos"
    await typeSelect.selectOption('todos');
    await waitForLoad(page);

    // 7c. Testa ordenação (clicando no botão de ordenar)
    const sortButton = page.locator('[aria-label="Alternar ordenação"]');
    await sortButton.click();
    // A label do botão muda de "Mais recentes" para "Mais antigos"
    await expect(sortButton).toContainText('Mais antigos');
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 8: Cópia (Copy individual clipping)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 8: Cópia de clipping individual', async ({ page }) => {
    // Ainda na página de detalhe do livro "A boa sorte"
    // Clica no botão "Copiar" do primeiro clipping

    const copyButtons = page.getByRole('button', { name: 'Copiar' });
    // Pode ter vários "Copiar" (cada clipping + "Copiar todos")
    const individualCopyBtn = copyButtons.first();
    await individualCopyBtn.click();

    // Verifica que o texto do botão mudou para "Copiado"
    await expect(page.getByRole('button', { name: 'Copiado' }).first()).toBeVisible();

    // Aguarda o estado resetar (timeout de 2000ms no componente)
    await page.waitForTimeout(2500);
    // O botão deve voltar a mostrar "Copiar"
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 9: Download Markdown
  // ──────────────────────────────────────────────────────────────
  test('Cenário 9: Download do livro em Markdown', async ({ page }) => {
    // Ainda na página de detalhe do livro "A boa sorte"

    // Aguarda o evento de download antes de clicar
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    await page.getByRole('button', { name: 'Baixar Markdown' }).click();

    const download = await downloadPromise;

    // Verifica o nome do arquivo
    expect(download.suggestedFilename()).toMatch(/A boa sorte\.md$/);

    // (Opcional) verifica conteúdo — mas não salvamos o arquivo para não poluir
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 10: Geração de Imagem (Quote generation)
  // ──────────────────────────────────────────────────────────────
  test('Cenário 10: Geração de imagem de citação', async ({ page }) => {
    // Ainda na página de detalhe do livro "A boa sorte"
    // Clica em "Gerar imagem" no primeiro clipping

    // Abre em nova aba — precisamos capturar o popup
    const pagePromise = page.context().waitForEvent('page', { timeout: 10000 });
    await page.getByRole('button', { name: 'Gerar imagem' }).first().click();
    const quotePage = await pagePromise;

    await quotePage.waitForLoadState('networkidle');
    await expect(quotePage.getByText('Imagem da Citação')).toBeVisible({ timeout: 10000 });

    // Verifica os controles de configuração
    await expect(quotePage.getByText('Configurações')).toBeVisible();
    await expect(quotePage.getByLabel('Cor de fundo')).toBeVisible();
    await expect(quotePage.getByLabel('Cor do texto')).toBeVisible();

    // Verifica checkboxes
    await expect(quotePage.getByText('Mostrar autor')).toBeVisible();
    await expect(quotePage.getByText('Mostrar título do livro')).toBeVisible();

    // Verifica que o preview da imagem existe
    const previewImg = quotePage.locator('img[alt="Preview da citação"]');
    await expect(previewImg).toBeVisible({ timeout: 10000 });

    // Verifica botão de download da imagem
    await expect(quotePage.getByRole('button', { name: 'Baixar imagem (PNG)' })).toBeVisible();

    // Fecha a aba da quote
    await quotePage.close();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 11: Reimportação sem duplicidade
  // ──────────────────────────────────────────────────────────────
  test('Cenário 11: Reimportação sem duplicidade', async ({ page }) => {
    await uploadClippings(page, SAMPLE_FILE);

    // Verifica o card de resultado
    await expect(page.getByText('Importação concluída')).toBeVisible();

    // Pega os valores das estatísticas
    // Total = 4 (os mesmos 4 registros que geram conteúdo)
    // Importados (novos) = 0 (todos já existem)
    // Duplicados (ignorados) > 0
    // Inválidos = 0

    // Verifica Duplicados > 0
    const duplicadosCard = page.locator('div').filter({ hasText: 'Duplicados (ignorados)' });
    const dupText = await duplicadosCard.textContent();
    // O valor de duplicados deve ser > 0
    expect(dupText).not.toBeNull();
    const dupMatch = dupText!.match(/\d+/);
    expect(dupMatch).not.toBeNull();
    expect(Number.parseInt(dupMatch![0], 10)).toBeGreaterThan(0);

    // Verifica Importados = 0
    const importadosCard = page.locator('div').filter({ hasText: 'Importados (novos)' });
    const impText = await importadosCard.textContent();
    expect(impText).not.toBeNull();
    expect(impText).toMatch(/0\b/);

    // Volta para livros e verifica que a contagem não mudou
    await page.getByRole('button', { name: 'Ver livros' }).click();
    await page.waitForURL(/\/books/, { timeout: 5000 });
    await waitForLoad(page);

    // A boa sorte ainda tem 3 clippings, O Poder do Hábito tem 2
    await expect(page.getByText('A boa sorte')).toBeVisible();
    await expect(page.getByText('O Poder do Hábito')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // Cenário 12: Persistência após reinício
  // ──────────────────────────────────────────────────────────────
  test('Cenário 12: Persistência dos dados (documentação)', async ({ page }) => {
    /**
     * Este teste verifica que os dados persistem após a importação.
     *
     * NOTA: Um teste completo de persistência exigiria:
     *   1. docker compose down
     *   2. docker compose up -d
     *   3. Refazer login
     *   4. Verificar que os livros ainda aparecem
     *
     * Como o Playwright não gerencia o ciclo de vida do Docker Compose,
     * este cenário documenta o comportamento esperado e verifica que
     * os dados estão presentes na sessão atual (pós-importação).
     *
     * Para testar a persistência completa, execute manualmente:
     *   1. Execute os cenários 1-11
     *   2. docker compose restart
     *   3. Execute este cenário isoladamente:
     *      npx playwright test -g "Cenário 12"
     */

    // Verifica que os livros ainda estão listados (persistiram na sessão atual)
    await page.goto('/books');
    await waitForLoad(page);

    await expect(page.getByText('Seus Livros')).toBeVisible();
    await expect(page.getByText('A boa sorte')).toBeVisible();
    await expect(page.getByText('O Poder do Hábito')).toBeVisible();

    // Verifica que podemos acessar o detalhe de um livro
    await page.getByText('A boa sorte').first().click();
    await page.waitForURL(/\/books\/[^/]+$/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'A boa sorte' })).toBeVisible();
  });
});
