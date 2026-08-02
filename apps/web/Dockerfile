# ── Stage 1: Build ───────────────────────────────────────────────────────────
# Compila a aplicação web com Vite (gera arquivos estáticos em apps/web/dist/).

FROM node:22.22.2-slim AS build

# Configura pnpm via corepack (versão fixa do projeto)
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# ── Copia arquivos de configuração raiz ──
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./

# ── Copia pacotes dos quais o web depende ──
COPY packages/domain/package.json packages/domain/tsconfig.json packages/domain/
COPY packages/schemas/package.json packages/schemas/tsconfig.json packages/schemas/
COPY packages/domain/src/ packages/domain/src/
COPY packages/schemas/src/ packages/schemas/src/

# ── Copia a aplicação web ──
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/
COPY apps/web/index.html apps/web/
COPY apps/web/src/ apps/web/src/

# ── Instala TODAS as dependências (incluindo devDependencies para build) ──
RUN pnpm install --frozen-lockfile

# ── Compila a aplicação web ──
# O build do Vite gera arquivos estáticos em apps/web/dist/
RUN pnpm --filter @my-clippings/web build

# ── Stage 2: Produção ────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# ── Copia arquivos estáticos do build ──
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# ── Copia configuração do nginx ──
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# ── Health check (nginx) ──
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

# ── Porta exposta ──
EXPOSE 80

# ── Executa nginx em foreground ──
CMD ["nginx", "-g", "daemon off;"]
