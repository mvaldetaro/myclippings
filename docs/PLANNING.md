# Planejamento do Projeto - My Clippings

Este documento estabelece o plano detalhado de implementação para o projeto **My Clippings**, seguindo os requisitos de [SPEC.md](file:///Users/magnovaldetaro/Projetos/myclippings/docs/SPEC.md) e a arquitetura em [ARCHITECTURE.md](file:///Users/magnovaldetaro/Projetos/myclippings/docs/ARCHITECTURE.md).

## 1. Objetivos do Projeto

Desenvolver uma aplicação monorepo composta por uma API (Fastify) e um Frontend Web (TanStack Start + React) que permita:
1. Importar o arquivo `My Clippings.txt` do Kindle.
2. Identificar e agrupar registros por livro (título e autor).
3. Persistir os clippings exclusivamente em arquivos Markdown organizados em um sistema de arquivos persistente (um arquivo por livro).
4. Evitar duplicidades de clippings (idempotência) utilizando uma assinatura/fingerprint (SHA-256).
5. Expor uma interface web acolhedora e editorial baseada no [DESIGN.md](file:///Users/magnovaldetaro/Projetos/myclippings/docs/DESIGN.md) para listar livros, ler clippings, filtrar, copiar, baixar os arquivos Markdown e gerar imagens de citação 1:1.
6. Armazenar apenas metadados operacionais e de indexação em um banco de dados SQLite (com Drizzle ORM). O conteúdo textual dos clippings nunca será salvo no banco.

---

## 2. Estratégia Técnica

### 2.1. Monorepo e Gerenciador de Pacotes
- **Gerenciador:** pnpm (conforme ARCHITECTURE §17).
- **Orquestrador de tarefas:** pnpm scripts com `--filter` para builds e execuções por pacote.
- **Formatador:** Biome (formatação e organização de imports).
- **Linter:** ESLint (análise estática, sem sobreposição com Biome).
- **Linguagem:** TypeScript em modo estrito em todos os pacotes e aplicações.

### 2.2. Divisão de Pacotes e Aplicações

#### Pacotes (`packages/`):
1. `packages/schemas`: Schemas de validação de dados compartilhados usando Zod.
2. `packages/domain`: Tipos, interfaces e regras de negócio puras (sem dependências de infraestrutura).
3. `packages/kindle-parser`: Parser robusto para ler e extrair registros do `My Clippings.txt` com suporte a `LF`/`CRLF` e codificações variadas.
4. `packages/markdown`: Repositório de arquivos Markdown, serializador, deserializador, controle de escrita atômica e mecanismos de locking.
5. `packages/database`: Configuração do Drizzle ORM, definições do schema SQLite e gerenciamento de migrações.
6. `packages/quote-generator`: Lógica de geração de imagens de citação no formato PNG 1:1.

#### Aplicações (`apps/`):
1. `apps/api`: Servidor HTTP Fastify que gerencia rotas de autenticação (JWT), upload de clippings, listagem e leitura de livros/clippings, download de Markdown e geração de imagens de citação.
2. `apps/web`: Aplicação web com TanStack Start + React + Tailwind CSS + shadcn/ui + TanStack Query. Seguirá a estética editorial e acolhedora descrita em [DESIGN.md](file:///Users/magnovaldetaro/Projetos/myclippings/docs/DESIGN.md). A fonte primária é Lato (Google Font).

### 2.3. Banco de Dados SQLite (Drizzle ORM)
Tabelas a serem implementadas:
- `users`: Cadastro de usuários e senhas protegidas com bcrypt/Argon2.
- `imports`: Histórico e contadores de importação por usuário.
- `user_settings`: Preferências do usuário.
- `file_index`: Índice de arquivos Markdown para otimização das listagens. Pode ser completamente reconstruído a partir do disco.

### 2.4. Persistência em Markdown
- Caminho determinístico de gravação: `/data/users/{userId}/books/{autor-slug}/{titulo-slug}-{bookId}/clippings.md`.
- Sanitização rigorosa de títulos e autores para evitar path traversal ou caracteres inválidos no sistema de arquivos.
- Escritas atômicas: escrever em arquivo temporário `.tmp` no mesmo volume, validar o conteúdo e renomear atomicamente para substituir o arquivo final.
- Travamento de concorrência por arquivo/livro durante importações concorrentes.

---

## 3. Etapas de Execução Propostas

### Fase 1: Setup do Monorepo e Infraestrutura Básica
- [ ] Inicializar o monorepo com `pnpm-workspace.yaml` e `package.json` raiz.
- [ ] Configurar TypeScript (`tsconfig.json` base + por pacote) em modo estrito.
- [ ] Configurar Biome (formatação + organização de imports) e ESLint (análise estática) com escopos não-sobrepostos.
- [ ] Criar `packages/schemas`: Schemas Zod compartilhados (User, Book, Clipping, Import, Settings).
- [ ] Criar `packages/database`: Drizzle ORM, schema SQLite (`users`, `imports`, `user_settings`, `file_index`), migrations.
- [ ] Criar `packages/kindle-parser`: Parser do `My Clippings.txt` com suporte a `LF`/`CRLF`/UTF-8/UTF-8 BOM.
- [ ] Criar fixtures de teste (`tests/fixtures/`) com arquivos de exemplo do Kindle (LF, CRLF, BOM, múltiplos livros, tipos variados, duplicados, inválidos).
- [ ] Configurar Vitest e escrever testes unitários para o parser com cobertura dos cenários das fixtures.
- [ ] Configurar `.env.example` com variáveis obrigatórias (sem segredos reais).

### Fase 2: Domínio e Persistência Markdown
- [ ] Criar `packages/domain`: Entidades e tipos puros (Book, Clipping, Import, User) sem dependências de infra.
- [ ] Criar `packages/markdown`: Serializador/deserializador de Markdown (front matter YAML + seções de clipping).
- [ ] Implementar leitura do front matter (schemaVersion, bookId, title, author, createdAt, updatedAt, clippingCount).
- [ ] Implementar leitura de clippings com parsing de `<!-- clipping-id: sha256:... -->` e metadados (tipo, página, localização, data).
- [ ] Implementar cálculo de fingerprint (SHA-256) a partir de: bookId + tipo + conteúdo normalizado + página + localização inicial + localização final + data do Kindle (RN-001).
- [ ] Implementar deduplicação: comparar fingerprints do upload contra os existentes no Markdown (RN-002, RN-003, RN-004).
- [ ] Implementar escrita atômica (RNF-006): gerar conteúdo → validar → escrever `.tmp` → `fsync` → renomear atômico.
- [ ] Implementar lock de concorrência por livro (RNF-007).
- [ ] Implementar sanitização de caminhos: rejeitar `../`, caracteres de controle, nomes reservados (ARCHITECTURE §9.3).
- [ ] Escrever testes unitários para serialização, parsing, fingerprint, deduplicação, sanitização e escrita atômica.

### Fase 3: API HTTP (Fastify) ✅ CONCLUÍDA (27/07/2026)
- [x] Configurar `apps/api`: servidor Fastify, plugins essenciais (cors, helmet, rate-limit, multipart, jwt, cookie).
- [x] Implementar health checks: liveness (`/health`), readiness (`/health/ready`), DB check, filesystem check (ARCHITECTURE §11.3).
- [x] Implementar autenticação:
  - Registro de usuário (`POST /auth/register`) com hash Argon2id.
  - Login (`POST /auth/login`) com emissão de JWT (httpOnly, Secure, SameSite).
  - Logout.
  - Middleware de autenticação e isolamento por `userId`.
- [x] Implementar rate limiting em rotas de auth e import (ARCHITECTURE §9.6).
- [x] Implementar logging estruturado com IDs de correlação por requisição (ARCHITECTURE §11.1-11.2).
- [x] Implementar o fluxo de importação (`POST /imports`): upload → validação → parser → agrupamento → leitura Markdown → fingerprint → deduplicação → escrita atômica → update FileIndex → resposta.
- [x] Implementar rotas de livros:
  - Listar livros (`GET /books`) — usa FileIndex para performance (RNF-010).
  - Obter livro com clippings (`GET /books/:bookId`) — lê diretamente do Markdown (RNF-011).
  - Baixar Markdown (`GET /books/:bookId/download`) — entrega o arquivo original (RF-018).
- [x] Implementar rotas de clippings:
  - Filtrar clippings por texto, tipo, página, localização, data (RF-013).
  - Obter clipping individual (RF-014).
- [x] Implementar reconstrução de índice na inicialização (RNF-005): percorrer `/data/users/`, localizar Markdown, ler front matter, atualizar `file_index`.
- [x] Implementar detecção de arquivos temporários abandonados na inicialização (RNF-008).
- [x] Implementar middleware de erro centralizado — nunca expor stack traces em produção.
- [x] Escrever testes de integração (Vitest) para auth, import, CRUD de livros, downloads e reconstrução de índice. (26 testes, 100% passando)

### Fase 4: Geração de Imagem de Citação
- [ ] Criar `packages/quote-generator`: lógica de renderização PNG 1:1 (1080×1080px).
- [ ] Suporte a formatação do texto da citação, metadados do livro, quebra de linha e margens.
- [ ] Tratamento de textos longos sem corte silencioso.
- [ ] Expor rotas na API: pré-visualização e download da imagem.
- [ ] Escrever testes unitários para o gerador.

### Fase 5: Interface Web (TanStack Router) ✅ CONCLUÍDA (01/08/2026)
- [x] Configurar `apps/web` com TanStack Router, Tailwind CSS v4.
- [x] Configurar fonte Lato (Google Font) no Tailwind conforme DESIGN.md.
- [x] Configurar tema de cores do DESIGN.md no Tailwind (`primary: #00635D`, `secondary: #F5D47A`, etc.).
- [x] Criar layout base com header, navegação e estrutura responsiva (360px+).
- [x] Desenvolver telas:
  - **Autenticação**: Login e Cadastro (seguindo DESIGN.md — cores, tipografia, componentes `card` e `button`).
  - **Dashboard**: Listagem de livros (título, autor, clippingCount, última alteração, tipos de clipping — RF-011) com busca (RNF-012).
  - **Leitura do livro**: Exibição de clippings com filtros (texto, tipo, página, localização, data — RF-013), cópia individual (RF-015), cópia de todos (RF-016), cópia em Markdown (RF-017), download (RF-018).
  - **Importação**: Upload do `My Clippings.txt` com feedback de progresso e resultado (importados, duplicados, inválidos).
  - **Citação**: Configuração visual e geração/download da imagem PNG 1:1 (RF-020).
  - **Configurações**: Preferências de interface e citação.
- [x] Integrar todas as telas com a API via TanStack Query.
- [x] Implementar estados de UI: loading, empty, error, not-found, unauthorized para cada tela.
- [x] Garantir que **não existe** botão de geração manual de Markdown (CA-007).
- [x] Garantir acessibilidade: navegação por teclado, foco visível, HTML semântico, contraste WCAG 2.1 AA.

### Fase 6: Docker, Testes E2E e Documentação ✅ CONCLUÍDA (01/08/2026)
- [x] Criar `Dockerfile` para `apps/api` (multi-stage, não-root, health check, graceful shutdown).
- [x] Criar `Dockerfile` para `apps/web` (multi-stage, não-root).
- [x] Configurar `docker-compose.yml` com serviços `api` + `web` e volumes `database-data` e `user-files`.
- [x] Configurar `.env.example` final com todas as variáveis necessárias.
- [x] Escrever testes E2E com Playwright: cadastro → login → upload → listagem → leitura → filtro → cópia → download → geração de imagem → reimportação → persistência pós-restart.
- [x] Documentar procedimento de backup/restore (SPEC RNF-009): SQLite + diretório `/data/users` + configurações.
- [x] Validar escrita atômica: simular falha durante atualização e verificar integridade do arquivo anterior (CA-008).
- [x] Validar reconstrução do índice: apagar `file_index` e verificar listagem após rebuild (CA-005).

---

## 4. Escopo Excluído do MVP

As seguintes funcionalidades estão **fora da primeira versão**:

- **Edição e exclusão de clippings** pela interface (SPEC §16). Os arquivos Markdown são imutáveis — só recebem novos registros via importação.
- **Download de todos os livros em ZIP** (RF-019: "posterior ao MVP").
- **Alterações manuais nos arquivos Markdown** pelo usuário no volume (RNF-004: "primeira versão poderá considerar esses arquivos como somente leitura externa").
- **Sincronização com Kindle**, APIs da Amazon, redes sociais, colaboração entre usuários (ARCHITECTURE §18).

---

## 5. Dependências Principais
- **Backend:** `fastify`, `@fastify/jwt`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, `drizzle-orm`, `better-sqlite3`, `zod`, `ulid`, `yaml` (front matter), `sharp` (geração de imagens).
- **Frontend:** `@tanstack/react-start`, `react`, `react-dom`, `@tanstack/react-query`, `@tanstack/react-router`, `lucide-react`, `tailwindcss`, `@fontsource/lato`.
- **Ferramentas:** `typescript`, `vitest`, `playwright`, `@biomejs/biome`, `eslint`, `pnpm`.

---

## 6. Critérios de Aceitação e Validação
Cada funcionalidade principal será validada através de testes automatizados e verificações manuais descritas em [SPEC.md](file:///Users/magnovaldetaro/Projetos/myclippings/docs/SPEC.md):
- **CA-001 a CA-008** descritos na especificação.
- Validação visual em telas de 360px a 1920px.
- Verificação de acessibilidade básica (foco visível, navegação por teclado).
