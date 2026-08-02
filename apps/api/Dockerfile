# ── Stage 1: Build ───────────────────────────────────────────────────────────
# Compila todos os pacotes do monorepo e a API, depois cria um deploy
# standalone com apenas dependências de produção.

FROM node:22.22.2-slim AS build

# Instala ferramentas necessárias para compilar módulos nativos
# (argon2, better-sqlite3 requerem python3, make, g++)
# canvas requer libcairo2-dev, libpango1.0-dev, libjpeg-dev, libgif-dev, librsvg2-dev
# para fallback-to-build caso binário pré-compilado não esteja disponível
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Configura pnpm via corepack (versão fixa do projeto)
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# ── Copia arquivos de configuração raiz ──
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# ── Copia todos os pacotes do workspace (necessários como dependências) ──
COPY packages/database/package.json packages/database/tsconfig.json packages/database/
COPY packages/domain/package.json packages/domain/tsconfig.json packages/domain/
COPY packages/schemas/package.json packages/schemas/tsconfig.json packages/schemas/
COPY packages/kindle-parser/package.json packages/kindle-parser/tsconfig.json packages/kindle-parser/
COPY packages/markdown/package.json packages/markdown/tsconfig.json packages/markdown/
COPY packages/quote-generator/package.json packages/quote-generator/tsconfig.json packages/quote-generator/

COPY packages/database/src/ packages/database/src/
COPY packages/database/migrations/ packages/database/migrations/
COPY packages/domain/src/ packages/domain/src/
COPY packages/schemas/src/ packages/schemas/src/
COPY packages/kindle-parser/src/ packages/kindle-parser/src/
COPY packages/markdown/src/ packages/markdown/src/
COPY packages/quote-generator/src/ packages/quote-generator/src/

# ── Copia a aplicação API ──
COPY apps/api/package.json apps/api/tsconfig.json apps/api/
COPY apps/api/src/ apps/api/src/

# ── Instala TODAS as dependências (incluindo devDependencies para build) ──
# --frozen-lockfile garante reprodutibilidade
RUN pnpm install --frozen-lockfile

# ── Compila todos os pacotes em ordem (dependências antes da API) ──
RUN pnpm -r build

# ── Cria deploy standalone com apenas dependências de produção ──
# pnpm deploy copia o pacote + workspace deps + node_modules de produção
RUN pnpm --filter @my-clippings/api deploy /prod --legacy

# ── Stage 2: Produção ────────────────────────────────────────────────────────
FROM node:22.22.2-slim AS production

# Ferramentas mínimas: curl para health check + libs runtime do canvas
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgif7 \
    libjpeg62-turbo \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

# ── Cria usuário não-root para execução ──
RUN groupadd -r nodejs && useradd -r -g nodejs -d /app -s /sbin/nologin nodejs

WORKDIR /app

# ── Copia o deploy standalone do stage de build ──
COPY --from=build --chown=nodejs:nodejs /prod /app

# ── Garante que os diretórios de dados existam com permissões corretas ──
# Volumes podem ser montados sobre estes diretórios; a criação aqui serve como
# fallback para quando nenhum volume é montado.
RUN mkdir -p /app/data/database /app/data/users \
  && chown -R nodejs:nodejs /app/data

# ── Usuário não-root ──
USER nodejs

# ── Porta exposta (configurável via API_PORT) ──
EXPOSE 3000

# ── Health check (ARCHITECTURE §11.3) ──
# Verifica o endpoint /health a cada 30s. O start-period de 15s
# dá tempo para migrations e rebuild do índice na inicialização.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:${API_PORT:-3000}/health || exit 1

# ── Entrypoint ──
# A API já possui graceful shutdown para SIGTERM/SIGINT (ARCHITECTURE §8.4)
# tsx é usado como runtime porque os workspace packages (@my-clippings/*)
# são distribuídos como TypeScript puro (main: ./src/index.ts).
CMD ["npx", "tsx", "dist/index.js"]
