# My Clippings

Importe, organize e leia seus clippings do Kindle — armazenados em Markdown, não no banco de dados.

O My Clippings transforma o arquivo `My Clippings.txt` do seu Kindle em uma biblioteca pessoal organizada por livro. Os destaques, notas e marcadores são persistidos como arquivos Markdown — legíveis por você, interpretáveis pela aplicação e prontos para download a qualquer momento.

## Funcionalidades

- **Importação idempotente** — reimporte o mesmo arquivo quantas vezes quiser, sem duplicar clippings
- **Organização por livro** — cada livro vira um arquivo Markdown com front matter estruturado
- **Interface editorial** — tipografia Lato, paleta acolhedora, design responsivo (360px+)
- **Busca e filtros** — encontre clippings por texto, tipo, página, localização e data
- **Cópia e download** — copie clippings individuais, todos de um livro, ou baixe o Markdown completo
- **Geração de imagens** — crie imagens 1:1 (1080×1080px) a partir das suas citações favoritas
- **Persistência garantida** — volumes Docker preservam seus dados mesmo após recriação dos containers

## Decisão arquitetural

**Os clippings NÃO são armazenados no banco de dados.** O SQLite guarda apenas usuários, preferências e um índice reconstruível. O conteúdo real vive em arquivos Markdown — que são a fonte de verdade da aplicação.

```
/data/users/{user-id}/books/{autor-slug}/{titulo-slug}-{book-id}/clippings.md
```

Leia mais em [`docs/SPEC.md`](docs/SPEC.md) e [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Pré-requisitos

| Ferramenta | Versão | Uso |
|---|---|---|
| [Node.js](https://nodejs.org/) | `>= 22.0.0` (recomendado 22.22.2) | Runtime |
| [pnpm](https://pnpm.io/) | `11.9.0` | Gerenciador de pacotes |
| [Docker](https://www.docker.com/) | `24+` | Containerização (opcional para dev) |
| [Docker Compose](https://docs.docker.com/compose/) | `2+` | Orquestração (opcional para dev) |

Para Node.js, recomendamos usar [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install  # lê .nvmrc automaticamente (v22.22.2)
nvm use
```

Para pnpm, use o corepack (já incluso no Node.js 22):

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

---

## Início Rápido

### Opção 1: Docker (recomendado para produção)

```bash
# 1. Clone o repositório
git clone <repo-url> my-clippings
cd my-clippings

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Gere um segredo JWT seguro:
openssl rand -hex 64
# Edite o .env e cole o valor em JWT_SECRET

# 3. Inicie os serviços
docker compose up -d

# As migrations do banco de dados são executadas automaticamente na inicialização
# do container (não é necessário executar db:generate ou db:migrate manualmente).
# Ao alterar o schema do banco, rebuild a imagem: docker compose build api

# 4. Acesse a aplicação
# Frontend: http://localhost:3000
# API:      http://localhost:3001/health
```

### Opção 2: Desenvolvimento Local

```bash
# 1. Clone e instale dependências
git clone <repo-url> my-clippings
cd my-clippings
pnpm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Gere um segredo JWT:
openssl rand -hex 64
# Cole no .env em JWT_SECRET

# 3. Execute as migrations do banco
pnpm db:generate
pnpm db:migrate

# 4. Inicie os servidores de desenvolvimento
pnpm dev
# API:  http://localhost:3001
# Web:  http://localhost:3000 (Vite com proxy para API)
```

### Gerando o JWT Secret

O `JWT_SECRET` é uma string aleatória usada para assinar os tokens de autenticação. **Nunca use o valor padrão em produção.**

```bash
# Linux / macOS
openssl rand -hex 64

# Windows (PowerShell)
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

Copie a string gerada e cole no arquivo `.env`:

```env
JWT_SECRET=sua-string-gerada-aqui
```

---

## Variáveis de Ambiente

Todas as variáveis estão documentadas em `.env.example`. As principais:

| Variável | Padrão | Descrição |
|---|---|---|
| `JWT_SECRET` | *(obrigatório)* | Segredo para assinatura JWT |
| `JWT_EXPIRATION` | `24h` | Expiração do token |
| `API_PORT` | `3001` | Porta da API no host |
| `WEB_PORT` | `3000` | Porta do frontend no host |
| `DATABASE_URL` | `./data/database/my-clippings.db` | Caminho do SQLite |
| `DATA_DIR` | `./data` | Diretório raiz de dados |
| `MAX_UPLOAD_SIZE` | `52428800` | Tamanho máximo de upload (50MB) |
| `NODE_ENV` | `development` | Ambiente (`development`, `production`, `test`) |

---

## Estrutura do Projeto

```
my-clippings/
├── apps/
│   ├── api/                    # API HTTP (Fastify + TypeScript)
│   │   ├── src/
│   │   │   ├── modules/        # auth, books, clippings, imports, quotes
│   │   │   ├── plugins/        # CORS, helmet, JWT, rate-limit
│   │   │   ├── startup/        # Rebuild de índice, cleanup
│   │   │   └── config/         # Variáveis de ambiente tipadas
│   │   ├── tests/              # Testes de integração (Vitest)
│   │   └── Dockerfile
│   │
│   └── web/                    # Frontend (React + TanStack Router)
│       ├── src/
│       │   ├── routes/         # Telas: login, books, import, quotes
│       │   ├── components/     # Button, Card, Input, Layout
│       │   ├── queries/        # TanStack Query hooks
│       │   └── styles/         # Tailwind CSS + DESIGN.md
│       ├── nginx.conf          # Proxy reverso em Docker
│       └── Dockerfile
│
├── packages/
│   ├── database/               # Drizzle ORM + schema SQLite
│   ├── domain/                 # Tipos e regras de negócio puras
│   ├── schemas/                # Schemas Zod compartilhados
│   ├── kindle-parser/          # Parser do My Clippings.txt
│   ├── markdown/               # Leitura/escrita atômica de Markdown
│   └── quote-generator/        # Geração de imagens PNG 1:1
│
├── tests/
│   ├── fixtures/               # Arquivos de teste do Kindle
│   └── e2e/                    # Testes E2E com Playwright
│
├── docs/                       # Documentação detalhada
├── data/                       # Dados locais (dev)
├── docker-compose.yml          # Orquestração Docker
└── .env.example                # Template de variáveis
```

---

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia API + Web em paralelo
pnpm dev:api          # Apenas a API (porta 3001)
pnpm dev:web          # Apenas o frontend (porta 3000)

# Build
pnpm build            # Compila todos os pacotes e apps

# TypeScript
pnpm typecheck        # Verificação de tipos em todos os pacotes

# Banco de dados
pnpm db:generate      # Gera migrations a partir do schema
pnpm db:migrate       # Aplica migrations pendentes
pnpm db:studio        # Abre o Drizzle Studio (interface visual)

# Qualidade de código
pnpm lint             # Biome + ESLint
pnpm lint:fix         # Corrige problemas automaticamente
pnpm format           # Formata com Biome
pnpm format:check     # Verifica formatação (CI)

# Testes
pnpm test             # Todos os testes (unitários + integração)
pnpm test:coverage    # Testes com relatório de cobertura
```

---

## Testes

### Testes Unitários e de Integração

```bash
pnpm test             # 169 testes (packages + API)
pnpm test:coverage    # Com relatório de cobertura
```

### Testes E2E (Playwright)

Requer os serviços Docker rodando:

```bash
# Inicia os serviços
docker compose up -d

# Executa os testes E2E (12 cenários)
WEB_APP_URL=http://localhost:3000 npx playwright test --config tests/e2e/playwright.config.ts

# Com UI interativa
WEB_APP_URL=http://localhost:3000 npx playwright test --config tests/e2e/playwright.config.ts --ui
```

Os cenários E2E cobrem o fluxo completo: cadastro → login → upload → listagem → leitura → filtro → cópia → download → geração de imagem → reimportação sem duplicidade → persistência.

---

## Backup e Restauração

### O que precisa de backup?

| Componente | Local | Reconstruível? |
|---|---|---|
| `/data/users/` (Markdown) | Volume Docker `myclippings-user-files` | **Não** — é a fonte de verdade |
| `/data/database/` (SQLite) | Volume Docker `myclippings-database-data` | Parcialmente (via Markdown) |
| `.env` (configuração) | Arquivo no host | Manualmente |

### Backup rápido (Docker)

```bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Para os serviços (garante consistência)
docker compose down

# Copia os volumes
docker run --rm -v myclippings-user-files:/data -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine cp -r /data /backup/users
docker run --rm -v myclippings-database-data:/data -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine cp -r /data /backup/database

# Reinicia
docker compose up -d
```

Instruções completas em [`docs/BACKUP.md`](docs/BACKUP.md).

---

## Stack Tecnológica

| Camada | Tecnologias |
|---|---|
| **Runtime** | Node.js 22, TypeScript (strict mode) |
| **API** | Fastify, Zod, Argon2id, JWT (httpOnly cookies) |
| **Frontend** | React 19, TanStack Router, TanStack Query, Tailwind CSS v4 |
| **Banco** | SQLite (better-sqlite3), Drizzle ORM |
| **Parser** | Regex customizado com suporte a LF/CRLF/UTF-8/BOM |
| **Imagens** | Sharp (renderização SVG → PNG) |
| **Container** | Docker multi-stage, nginx (web), pnpm deploy (api) |
| **Testes** | Vitest (unitários/integração), Playwright (E2E) |
| **Qualidade** | Biome (formatação), ESLint (análise estática) |
| **Pacotes** | pnpm workspace (monorepo) |

---

## Documentação

- [`docs/SPEC.md`](docs/SPEC.md) — Especificação completa do projeto
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitetura, componentes e fluxos
- [`docs/DESIGN.md`](docs/DESIGN.md) — Design system (cores, tipografia, componentes)
- [`docs/BACKUP.md`](docs/BACKUP.md) — Procedimentos de backup e restauração
- [`docs/PLANNING.md`](docs/PLANNING.md) — Planejamento e fases do projeto
- [`docs/HISTORY.md`](docs/HISTORY.md) — Histórico de implementação
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Decisões técnicas e memórias
- [`docs/DISCUSSIONS.md`](docs/DISCUSSIONS.md) — Discussões e tradeoffs

---

## Licença

MIT — versão 0.1.0 (MVP).
