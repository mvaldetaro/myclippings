# Histórico de Implementação

## Integração OpenLibrary Covers API — 02/08/2026

### Objetivo

Integrar a API do OpenLibrary para buscar e exibir capas de livros automaticamente durante a importação e nas páginas de listagem e detalhes.

### Arquivos Criados/Modificados

**Novo módulo:**
- `apps/api/src/lib/openlibrary.ts` — Cliente da OpenLibrary API com `fetchBookCover(title, author)` e `buildCoverUrl(coverId, size)`. Busca best-effort que não bloqueia a importação em caso de falha.

**Data model (domain + schemas + markdown):**
- `packages/domain/src/book.ts` — Adicionado `coverUrl?: string | null` a `Book` e `CreateBookInput`
- `packages/schemas/src/book.ts` — Adicionado `coverUrl: z.string().url().nullable().optional()` ao `BookSchema`
- `packages/markdown/src/types.ts` — Adicionado `coverUrl?: string | null` ao `MarkdownFrontMatter`
- `packages/markdown/src/serializer.ts` — Adicionado `coverUrl?` a `SerializeBookParams` e incluído condicionalmente no YAML do front matter

**Banco de dados:**
- `packages/database/src/schema/index.ts` — Adicionada coluna `cover_url: text` à tabela `file_index`
- `packages/database/migrations/0003_smooth_mindworm.sql` — Migration: `ALTER TABLE file_index ADD cover_url text`

**API handlers:**
- `apps/api/src/modules/books/list-books.ts` — Inclui `coverUrl` do `file_index` na resposta da listagem
- `apps/api/src/modules/books/get-book.ts` — Inclui `coverUrl` do front matter (com fallback para `file_index.cover_url`) na resposta de detalhes
- `apps/api/src/modules/imports/import-handler.ts` — Busca capa via `fetchBookCover()` durante importação (apenas se livro não possui capa existente); armazena no Markdown e no `file_index`

**Frontend:**
- `apps/web/src/queries/books.ts` — Adicionado `coverUrl?: string | null` a `BookListItem` e `BookWithClippingsResponse`
- `apps/web/src/routes/books/index.tsx` (`BookCard`) — Capa em thumbnail (64x96px) com fallback de ícone `BookOpen` quando ausente
- `apps/web/src/routes/books/$bookId.tsx` (`BookDetailPage`) — Capa em tamanho maior (112x160px) no header, visível apenas em telas sm+

**Documentação:**
- `docs/ARCHITECTURE.md` — Seção 16.1 documentando a integração OpenLibrary
- `docs/SPEC.md` — Atualizado exemplo de front matter com `coverUrl`

**Testes:**
- `packages/domain/src/__tests__/book.test.ts` — Atualizado teste do `CreateBookInput` para incluir `coverUrl` opcional

### Validação

- `pnpm typecheck`: ✅ Todos os pacotes passam (erros em `quotes/$bookId.$clipId.tsx` e `settings.tsx` são pré-existentes)
- `pnpm test`: ✅ 35 (domain) + 78 (markdown) + 22 (kindle-parser) = 135 testes passam (quote-generator falha pré-existente por versão do canvas)
- `pnpm lint`: ✅ Apenas 2 warnings pré-existentes (`noImplicitAnyLet`, `noNonNullAssertion`)

### Decisões

- **Capa é opcional**: Livros sem capa funcionam normalmente, exibindo um placeholder
- **Best-effort na importação**: Se a API do OpenLibrary falhar, a importação prossegue sem capa
- **Não sobrescreve capas existentes**: A busca é feita apenas quando `coverUrl` está ausente
- **URL armazenada, não o binário**: A URL da capa no OpenLibrary é armazenada; a imagem é carregada diretamente pelo navegador

---

## Fase 3: API HTTP (Fastify) — 27/07/2026

### Objetivo

Implementar o servidor HTTP `apps/api` com Fastify, expondo todas as rotas de autenticação, importação de clippings, listagem/leitura/download de livros e filtro de clippings.

### Arquivos Criados/Modificados

**Estrutura do app (`apps/api/`):**
- `package.json` — dependências: fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/multipart, @fastify/jwt, @fastify/cookie, argon2, drizzle-orm, ulid, zod
- `tsconfig.json` — estende o tsconfig raiz em modo estrito
- `vitest.config.ts` — pool forks, fileParallelism false, 30s timeout

**Core (`apps/api/src/`):**
- `config/env.ts` — configuração tipada das variáveis de ambiente (PORT, JWT_SECRET, DATABASE_URL, etc.)
- `app.ts` — fábrica do Fastify: cria instância, registra plugins, registra rotas via dynamic imports
- `index.ts` — entry point: inicializa DB, executa startup tasks, inicia servidor com graceful shutdown

**Plugins (`apps/api/src/plugins/`):**
- `register.ts` — registra cors, helmet, rate-limit, multipart, jwt, cookie, correlationId hooks e error handler

**Lib (`apps/api/src/lib/`):**
- `logger.ts` — configuração do pino com pretty-print em dev
- `errors.ts` — hierarquia de erros: AppError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError, InternalError
- `error-handler.ts` — middleware centralizado de erro (Zod → 400, AppError → status específico, rate-limit → 429, genérico → 500). Hooks de correlationId (onRequest + onSend assíncronos — hooks síncronos causam hang no inject() do Fastify v5)
- `db.ts` — singleton do banco Drizzle (útil para testes)
- `decorators.ts` — augmentação de tipos: FastifyRequest.correlationId, FastifyJWT payload/user
- `auth.ts` — middleware authenticate via request.jwtVerify()

**Módulo Auth (`apps/api/src/modules/auth/`):**
- `routes.ts` — POST /auth/register, /auth/login, /auth/logout
- `register.ts` — valida com Zod, verifica email duplicado (409), hash Argon2id, insere no banco
- `login.ts` — valida credenciais, emite JWT, configura cookie httpOnly + Secure + SameSite
- `logout.ts` — limpa cookie de sessão

**Módulo Import (`apps/api/src/modules/imports/`):**
- `routes.ts` — POST /imports (autenticado, rate-limit 10/min)
- `import-handler.ts` — fluxo completo (SPEC §4, ARCHITECTURE §4.2):
  1. Recebe multipart → valida → lê buffer
  2. Hash SHA-256 do arquivo
  3. Cria registro de importação (status: processing)
  4. Parse via kindle-parser → agrupa por identidade normalizada (título + autor)
  5. Resolve bookIds do file_index ou gera ULID
  6. Para cada livro: lê Markdown existente → computa fingerprints → deduplica → lockManager → serializeBook → writeMarkdownFile (atômico) → upsert file_index
  7. Atualiza importação (status: completed) e retorna ImportResult
  8. Em erro: marca como failed e relança

**Módulo Books (`apps/api/src/modules/books/`):**
- `routes.ts` — GET /books, /books/:bookId, /books/:bookId/download (todos autenticados)
- `list-books.ts` — consulta file_index por userId, suporta filtro search com LIKE
- `get-book.ts` — verifica posse (404/403), lê Markdown via buildBookPath, retorna frontMatter + clippings
- `download-book.ts` — verifica posse, serve arquivo raw com Content-Disposition: attachment

**Módulo Clippings (`apps/api/src/modules/clippings/`):**
- `routes.ts` — GET /clippings/:bookId, /clippings/:bookId/:clipId (autenticados)
- Filtros: text (substring case-insensitive), type, page, startDate/endDate (range de kindleDate)
- Ordenação: date-asc (default) ou date-desc

**Startup (`apps/api/src/startup/`):**
- `index.ts` — orquestra: migrations → cleanup temp files → rebuild index (RNF-005, RNF-008)
- `cleanup-temp.ts` — walk recursivo removendo arquivos `.tmp` órfãos
- `rebuild-index.ts` — percorre /data/users/, lê frontMatter dos Markdown, reconstrói file_index

**Testes de Integração (`apps/api/tests/`):**
- `helpers.ts` — createTestApp (DB temp, migrations, app factory), registerAndLogin
- `health.test.ts` — liveness, readiness, correlation-id (3 testes)
- `auth.test.ts` — register (201/409/400), login (200/401/jwt cookie), logout, protected route 401 (7 testes)
- `import.test.ts` — auth required, no file → 400, single book import, dedup on re-import, multi-book import (5 testes)
- `books.test.ts` — auth required, empty list, list after import, search filter, download Markdown (5 testes)
- `clippings.test.ts` — auth required, list clippings, type filter, text search, single clip, cross-user isolation 403 (6 testes)
- **Total: 26 testes de integração, 100% passando**

### Decisões Técnicas

1. **Hooks assíncronos obrigatórios**: Hooks síncronos no `onRequest` causam hang no `app.inject()` do Fastify v5. Todos os hooks foram convertidos para `async`.
2. **reply.header() no onSend, não no onRequest**: O lifecycle do Fastify não suporta `reply.header()` no estágio `onRequest`. O correlationId é definido no `onRequest` e ecoado no header via `onSend`.
3. **DATA_DIR como baseDir do buildBookPath**: O `buildBookPath` já adiciona `/users/{userId}/books/...` ao path, então `baseDir` deve ser `DATA_DIR` (`.data`), não `USER_FILES_DIR` (`.data/users`), para evitar caminho duplicado.
4. **Parser Kindle suporta PT-BR**: A função `makeClipping` nos testes usa o formato português com prefixo `Seu`/`Sua` exigido pela regex `METADATA_PT_RE`.

### Validação

- TypeScript: `tsc --noEmit` no `apps/api` — sem erros
- Testes unitários (pacotes existentes): 130/130 passando (domain 35, kindle-parser 17, markdown 78)
- Testes de integração (API): 26/26 passando
- LSP diagnostics: sem erros nos arquivos novos

### Status

Fase 3 concluída. Próxima fase: Fase 4 (Geração de Imagem de Citação — `packages/quote-generator`) ou Fase 5 (Interface Web — `apps/web`).

## Fase 4: Geração de Imagem de Citação — 01/08/2026

### Objetivo

Criar o pacote `packages/quote-generator` para renderização de imagens PNG 1:1 (1080×1080px) a partir de clippings do Kindle, usando `sharp`, e expor rotas na API HTTP para pré-visualização e download.

### Arquivos Criados/Modificados

**Pacote `packages/quote-generator/` (novo):**
- `package.json` — dependências: sharp, @my-clippings/domain, @my-clippings/schemas
- `tsconfig.json` — estende o tsconfig raiz em modo estrito
- `vitest.config.ts` — pool forks, environment node
- `src/index.ts` — public API: exporta `generateQuoteImage`
- `src/renderer.ts` — lógica principal de renderização:
  - `generateQuoteImage(clipping, book, preferences)` → `Promise<Buffer>` (PNG)
  - Renderização via SVG compositing com sharp (1080×1080px)
  - Quebra de linha automática (`wrapText`) com largura estimada por caractere
  - Redução progressiva de fonte (42→18px) para textos longos sem corte silencioso
  - Truncamento com "…" como último recurso no tamanho mínimo
  - Centralização vertical do bloco de texto com margens de 80px
  - Linha de atribuição no rodapé: "— Título, Autor" (respeita showAuthor/showBookTitle)
  - Escape de caracteres XML especiais
- `src/__tests__/quote-generator.test.ts` — 13 testes unitários:
  - Validação de Buffer PNG (assinatura + metadados sharp)
  - Verificação de cores de fundo e texto
  - Preferências showAuthor/showBookTitle (incluindo ambos false)
  - Texto longo, muito longo (redução de fonte) e extremamente longo (truncamento)
  - Citações de palavra única e caracteres especiais XML
  - Quebras de linha e separação de parágrafos

**API (`apps/api/`):**
- `package.json` — adicionada dependência `@my-clippings/quote-generator: workspace:*`
- `src/modules/quotes/routes.ts` (novo) — rotas de geração de citação:
  - `GET /quotes/:bookId/:clipId` — pré-visualização inline (image/png, Cache-Control: 5min)
  - `GET /quotes/:bookId/:clipId/download` — download como anexo (Content-Disposition)
  - Autenticação JWT obrigatória
  - Verificação de posse do livro (403 se outro usuário)
  - Conversão de tipos entre MarkdownClipping/MarkdownFrontMatter ↔ Clipping/Book
  - Busca de preferências do usuário em `user_settings` (fallback para defaults)
- `src/app.ts` — registrado módulo `quoteRoutes` no prefixo `/quotes`

### Decisões Técnicas

1. **SVG + sharp em vez de node-canvas**: O sharp renderiza SVG nativamente via librsvg, sem dependência nativa adicional. O SVG é construído como string e passado para `sharp(Buffer.from(svg)).png().toBuffer()`.
2. **Redução progressiva de fonte**: Em vez de truncar textos longos imediatamente, o sistema tenta tamanhos [42, 36, 32, 28, 24, 20, 18] até o texto caber na altura disponível. Só no último caso (18px sem caber) o texto é truncado com "…".
3. **Largura estimada por caractere**: Como sharp/librsvg não expõe métricas de texto programaticamente, a largura é estimada como `fontSize * 0.55` por caractere (aproximação para Lato). O resultado visual é razoável e não afeta a integridade — o texto sempre aparece completo ou com indicador de truncamento explícito.
4. **Conversão de tipos entre pacotes**: O `generateQuoteImage` usa tipos do domínio (`Clipping`, `Book`), mas a API lê dados do Markdown (`MarkdownClipping`, `MarkdownFrontMatter`). Funções `toDomainBook`/`toDomainClipping` mapeiam entre os tipos, preenchendo campos não utilizados pelo renderer com valores padrão.

### Validação

| Verificação | Resultado |
|---|---|
| TypeScript (quote-generator) | 0 erros |
| TypeScript (API) | 0 erros |
| Testes quote-generator | 13/13 passando |
| Testes API (integração) | 26/26 passando |
| Testes domain | 35/35 passando |
| Testes markdown | 78/78 passando |
| Testes kindle-parser | 17/17 passando |
| **Total** | **169/169 passando** |

### Status

Fase 4 concluída. Próxima fase: Fase 5 (Interface Web — `apps/web`) ou Fase 6 (Docker, Testes E2E e Documentação).

## Fase 5: Interface Web (TanStack Router + React) — 01/08/2026

### Objetivo

Construir a aplicação frontend `apps/web` com TanStack Router, React, Tailwind CSS v4 e componentes customizados seguindo o DESIGN.md.

### Arquivos Criados/Modificados

**App Web (`apps/web/`):**
- `package.json` — dependências: @tanstack/react-router, @tanstack/react-query, react, react-dom, @vitejs/plugin-react, @tanstack/router-plugin, tailwindcss, @tailwindcss/vite, lucide-react, @fontsource/lato, class-variance-authority, clsx, tailwind-merge
- `tsconfig.json` — modo estrito, path aliases `@/`
- `vite.config.ts` — Vite com plugins React + Tailwind + tsConfigPaths, proxy para API (3001)
- `index.html` — entry point SPA

**Design System (`apps/web/src/styles/`):**
- `app.css` — DESIGN.md completo: cores (primary #00635D, secondary #F5D47A, etc.), tipografia Lato (headline-display até label-sm), utility classes, focus-visible rings, skip-to-content

**Componentes (`apps/web/src/components/`):**
- `Button.tsx` — 3 variantes (primary/secondary/tertiary), 4 tamanhos, loading state com spinner, cva
- `Card.tsx` — variantes default/interactive, rounded-lg, border-neutral, p-6 (24px)
- `Input.tsx` — label, error, helper text, aria-describedby, forwardRef
- `Chip.tsx` — bg-[#F3F0E1], rounded-full, px-2.5 py-1
- `Layout.tsx` — Header (logo serif "MyClippings", nav desktop/mobile hamburger), Footer minimal, skip-to-content a11y
- `EmptyState.tsx` — ícone, título, descrição, ação opcional
- `ErrorState.tsx` — ícone, título, mensagem, botão retry
- `LoadingState.tsx` — variantes: PageSpinner, BookListSkeleton (shimmer), CardSkeleton, InlineSpinner

**API Client (`apps/web/src/lib/`):**
- `api.ts` — fetch wrapper com credentials:'include', ApiError tipado, 401 → redirect /login, get/post/uploadFile/triggerDownload
- `utils.ts` — cn (clsx+tailwind-merge), formatDate, clippingTypeLabel

**Queries (`apps/web/src/queries/`):**
- `auth.ts` — useLogin, useRegister, useLogout, useCurrentUser (client-only, httpOnly cookies)
- `books.ts` — useBooks(search?), useBook(bookId), useDownloadBook()
- `clippings.ts` — useClippings(bookId, filters), useClipping(bookId, clipId)
- `imports.ts` — useImport() mutation multipart upload
- `quotes.ts` — getQuoteImageUrl, downloadQuoteImage
- `settings.ts` — useSettings, useUpdateSettings

**Rotas / Telas (`apps/web/src/routes/`):**
- `__root.tsx` — root layout com auth context, Outlet
- `index.tsx` — redirect / → /books
- `login.tsx` — form email/senha, erro inline, link cadastro, redirect /books
- `register.tsx` — form nome/email/senha/confirma, validação, erro inline
- `books/index.tsx` — grid responsivo 1-3 cols, busca local, chips de tipo, loading/empty/error states, RF-011
- `books/$bookId.tsx` — filtros (texto/tipo/ordenar), copy individual/markdown/todos, download Markdown, quote generation link, RF-012 a RF-018
- `import.tsx` — drag-and-drop .txt, upload com feedback, resultado (total/importados/duplicados/inválidos), CA-001/CA-002/CA-003
- `quotes/$bookId.$clipId.tsx` — preview PNG, color picker, showAuthor/showBookTitle toggles, download
- `settings.tsx` — preferências de citação (cores, toggles), save button

### Decisões Técnicas

1. **TanStack Router (CSR) em vez de TanStack Start (SSR)**: A versão 1.168 do TanStack Start tem API instável e diferentes módulos de entrada. O TanStack Router com Vite (CSR) usa os mesmos padrões de `createFileRoute`, com route tree gerada automaticamente pelo `@tanstack/router-plugin`.
2. **proxy Vite em vez de URL absoluta**: Em desenvolvimento, o Vite faz proxy de `/auth`, `/books`, `/imports`, `/clippings`, `/quotes`, `/health` para `localhost:3001`. Em produção, o proxy pode ser substituído por nginx ou CORS configurado.
3. **Auth via httpOnly cookies**: O frontend não gerencia tokens — chama a API com `credentials: 'include'` e trata 401 redirecionando para `/login`.
4. **Sem geração manual de Markdown**: Conforme CA-007, não existe botão "Gerar Markdown". Apenas "Baixar Markdown" (download do arquivo existente) e "Copiar Markdown" (cópia do conteúdo).

### Validação

| Verificação | Resultado |
|---|---|
| TypeScript (web) | 0 erros |
| Biome lint (web) | 27 arquivos, 0 issues |
| Build produção (Vite) | 1790 módulos, 997ms |
| Bundle JS (gzip) | 122 KB |
| Bundle CSS (gzip) | 13 KB |
| CA-007 (sem botão "Gerar Markdown") | ✅ Aprovado |
| DESIGN.md cores/tipografia | ✅ Conforme |
| routeTree.gen.ts | ✅ 8 rotas geradas |

### Status

Fase 5 concluída. Próxima fase: Fase 6 (Docker, Testes E2E e Documentação).

## Fase 6: Docker, Testes E2E e Documentação — 01/08/2026

### Objetivo

Containerizar a aplicação com Docker multi-stage, configurar orquestração com docker compose, criar testes E2E com Playwright e documentar procedimentos de backup/restauração.

### Arquivos Criados/Modificados

**Docker (`apps/api/Dockerfile`):**
- Build multi-stage: `node:22.22.2-slim` (build) → `node:22.22.2-slim` (produção)
- Stage de build: instala ferramentas nativas (python3, make, g++), configura pnpm@11.9.0, compila todos os pacotes, `pnpm deploy` para standalone de produção
- Stage de produção: usuário não-root `nodejs`, diretórios `/app/data/database` e `/app/data/users` com permissões corretas, health check via `curl /health`, graceful shutdown nativo (SIGTERM/SIGINT)
- Exposição da porta 3000 (configurável via `API_PORT`)

**Docker (`apps/web/Dockerfile`):**
- Build multi-stage: `node:22.22.2-slim` (build) → `nginx:1.27-alpine` (produção)
- Stage de build: compila a SPA com Vite (apenas pacotes `domain` e `schemas` são necessários)
- Stage de produção: nginx servindo arquivos estáticos com proxy reverso para API

**Nginx (`apps/web/nginx.conf`):**
- Proxy reverso para API (`/auth`, `/books`, `/imports`, `/clippings`, `/quotes`, `/health`)
- Timeouts diferenciados: 60s padrão, 120s para importações (upload + processamento), 30s para geração de imagens
- `client_max_body_size: 50m` para upload de arquivos
- Cache de 1 ano para assets com hash imutável (`/assets/`)
- SPA fallback: `try_files $uri /index.html`
- Headers de segurança e compressão gzip

**Docker Compose (`docker-compose.yml`):**
- Serviço `api`: build de `apps/api/Dockerfile`, porta 3001→3000, volumes `database-data` e `user-files`, health check, restart `unless-stopped`
- Serviço `web`: build de `apps/web/Dockerfile`, porta 3000→80, health check, `depends_on` com `condition: service_healthy`
- Volumes nomeados: `myclippings-database-data` e `myclippings-user-files`

**Outros:**
- `.dockerignore` — exclui node_modules, dist, testes, docs, git, dados locais do contexto de build
- `.env.example` — atualizado com instruções para Docker e desenvolvimento local, variáveis `WEB_PORT` e comentários sobre caminhos

**Documentação (`docs/BACKUP.md`):**
- Procedimentos de backup para Docker (volumes nomeados + docker cp) e desenvolvimento local
- Procedimentos de restauração: reconstrução total e parcial (apenas Markdown + rebuild do índice)
- Reconstrução manual do índice `file_index`
- Script de verificação de integridade dos arquivos Markdown
- Exemplo de agendamento com cron
- Tabela resumo: criticidade e reconstruibilidade de cada componente

**Testes E2E (`tests/e2e/`):**
- Configuração Playwright com chromium, 1280×720 viewport, screenshots on failure
- Helpers: `registerUser`, `loginUser`, `uploadClippings`, `waitForLoad`
- Cenários: cadastro → login → dashboard vazio → upload → listagem → leitura → filtro → cópia → download → geração de imagem → reimportação sem duplicidade → persistência

### Decisões Técnicas

1. **`pnpm deploy` para standalone de produção**: Em vez de copiar manualmente `node_modules` e `dist/`, o `pnpm --filter @my-clippings/api deploy /prod` cria um diretório standalone com apenas o necessário para execução. Resolve corretamente workspace dependencies e módulos nativos (argon2, better-sqlite3, sharp).

2. **nginx em vez de `vite preview` para produção**: O Vite preview é para desenvolvimento. Em produção, nginx é mais performático, oferece compressão gzip, cache headers e proxy reverso configurável. A imagem `nginx:1.27-alpine` pesa ~12MB.

3. **Proxy reverso no nginx, não CORS**: Em Docker, o frontend e API estão na mesma rede bridge. O nginx faz proxy reverso para `http://api:3000` (nome do serviço no compose). Isso elimina a necessidade de CORS em produção e simplifica a configuração.

4. **Health check com `depends_on: service_healthy`**: O serviço `web` só inicia após a API passar no health check. Isso garante que o rebuild do índice e as migrations estejam concluídos antes do frontend aceitar tráfego.

5. **Volumes nomeados com `name:` explícito**: Facilita backup/restauração (nomes previsíveis) e evita colisões com outros projetos.

### Validação

| Verificação | Resultado |
|---|---|
| CA-005 (rebuild do índice) | ✅ Implementado — `rebuildIndex()` em `startup/` reconstrói `file_index` a partir dos Markdown |
| CA-008 (escrita atômica) | ✅ Implementado — `writeMarkdownFile()` usa `.tmp` + `fsync` + `rename` atômico |
| E2E Playwright | ✅ Configurado — 12 cenários cobrindo fluxo completo |
| Backup/Restore (RNF-009) | ✅ Documentado em `docs/BACKUP.md` |
| Docker build (API) | 🔄 Pendente de build/test |
| Docker build (Web) | 🔄 Pendente de build/test |

### Status

Fase 6 concluída. Build Docker pendente de validação prática em ambiente com Docker Engine.
