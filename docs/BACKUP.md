# Backup e Restauração - My Clippings

Este documento descreve o procedimento de backup e restauração dos dados do My Clippings, conforme RNF-009 da especificação.

## Visão Geral

O My Clippings armazena dados em dois locais distintos que precisam ser preservados:

| Componente | Local | Conteúdo |
|---|---|---|
| Banco SQLite | `/data/database/my-clippings.db` | Usuários, preferências, histórico de importações, índice de arquivos |
| Arquivos Markdown | `/data/users/` | Fonte de verdade dos livros e clippings |

**O diretório `/data/users/` é o mais crítico**, pois contém o conteúdo real dos clippings. O SQLite armazena apenas metadados operacionais e pode ser reconstruído parcialmente a partir dos arquivos Markdown.

## Ambientes

### Docker (docker compose)

Os volumes são gerenciados pelo Docker e nomeados como:
- `myclippings-database-data` → montado em `/app/data/database`
- `myclippings-user-files` → montado em `/app/data/users`

### Desenvolvimento Local

Os dados ficam no diretório `./data/` na raiz do projeto:
- `./data/database/`
- `./data/users/`

---

## Procedimento de Backup

### 1. Backup via Docker

#### Backup dos volumes nomeados

```bash
# Cria um diretório de backup com timestamp
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup do banco SQLite
docker run --rm \
  -v myclippings-database-data:/data \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine cp -r /data /backup/database

# Backup dos arquivos Markdown
docker run --rm \
  -v myclippings-user-files:/data \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine cp -r /data /backup/users

echo "Backup salvo em: $BACKUP_DIR"
```

#### Backup com docker compose (alternativa)

```bash
# Usando docker compose cp (copiar do container para o host)
docker compose cp api:/app/data/database ./backups/database
docker compose cp api:/app/data/users ./backups/users
```

### 2. Backup em Desenvolvimento Local

```bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copia SQLite e diretório de usuários
cp ./data/database/my-clippings.db "$BACKUP_DIR/"
cp -r ./data/users "$BACKUP_DIR/users"

echo "Backup salvo em: $BACKUP_DIR"
```

### 3. Backup da Configuração

Além dos dados, preserve a configuração:

```bash
# Arquivo de variáveis de ambiente (sem segredos reais - ajustar antes de restaurar)
cp .env "$BACKUP_DIR/.env.bak"

# Ou, se não tiver .env:
cp .env.example "$BACKUP_DIR/.env.example"
```

### 4. Consistência do Backup

**IMPORTANTE**: Como SQLite e arquivos Markdown são armazenamentos separados, o backup deve ser feito com a aplicação parada para garantir consistência entre o índice e os arquivos.

```bash
# 1. Para a aplicação
docker compose down

# 2. Executa o backup

# 3. Reinicia a aplicação
docker compose up -d
```

Se não for possível parar a aplicação, restaure a partir do diretório Markdown (que é a fonte de verdade) e reconstrua o índice.

---

## Procedimento de Restauração

### 1. Restauração via Docker

#### Cenário A: Recriar volumes limpos

```bash
# 1. Para os serviços
docker compose down

# 2. Remove volumes existentes (DESTRUTIVO)
docker compose down -v

# 3. Recria os volumes
docker compose up -d
# Aguarda a inicialização e depois para novamente:
docker compose down

# 4. Restaura os dados nos volumes
docker run --rm \
  -v myclippings-database-data:/data \
  -v "$(pwd)/backups/20260101_120000/database:/backup" \
  alpine sh -c "rm -rf /data/* && cp -r /backup/* /data/"

docker run --rm \
  -v myclippings-user-files:/data \
  -v "$(pwd)/backups/20260101_120000/users:/backup" \
  alpine sh -c "rm -rf /data/* && cp -r /backup/* /data/"

# 5. Inicia os serviços
docker compose up -d
```

#### Cenário B: Restaurar apenas os arquivos Markdown

Se você perdeu apenas o banco SQLite (ou quer reconstruir o índice), pode restaurar apenas os Markdown:

```bash
# Restaura apenas o volume de usuários
docker run --rm \
  -v myclippings-user-files:/data \
  -v "$(pwd)/backups/20260101_120000/users:/backup" \
  alpine sh -c "rm -rf /data/* && cp -r /backup/* /data/"

# Na reinicialização, a API reconstruirá o índice file_index
# a partir dos arquivos Markdown (RNF-005).
docker compose restart api
```

### 2. Restauração em Desenvolvimento Local

```bash
# 1. Para a aplicação
# (Ctrl+C no terminal)

# 2. Restaura os arquivos
BACKUP_DIR="./backups/20260101_120000"
cp "$BACKUP_DIR/my-clippings.db" ./data/database/my-clippings.db
rm -rf ./data/users
cp -r "$BACKUP_DIR/users" ./data/users

# 3. Reinicia a aplicação
pnpm dev
```

---

## Reconstrução do Índice

O índice `file_index` no SQLite é derivado e pode ser reconstruído a partir dos arquivos Markdown. A reconstrução ocorre automaticamente na inicialização da API (RNF-005).

### Reconstrução Manual

Se precisar forçar a reconstrução:

```bash
# 1. Conecta ao banco SQLite
docker compose exec api node -e "
  const db = require('better-sqlite3')('/app/data/database/my-clippings.db');
  db.exec('DELETE FROM file_index');
  console.log('Índice removido. Reinicie a API para reconstruir.');
"

# 2. Reinicia a API (executará o rebuild na inicialização)
docker compose restart api

# 3. Verifica se a reconstrução foi bem-sucedida
# Os livros devem aparecer na listagem novamente após o rebuild.
```

### Validação do Rebuild (CA-005)

Após a reconstrução:
- Todos os livros devem aparecer na listagem
- Nenhum conteúdo de clipping deve ser perdido
- Os arquivos Markdown originais permanecem inalterados

---

## Integridade dos Arquivos

### Escrita Atômica (RNF-006)

As escritas nos arquivos Markdown são atômicas para evitar corrupção:

1. O conteúdo novo é gerado em memória
2. Gravado em arquivo temporário (`.tmp`) no mesmo volume
3. O arquivo temporário é sincronizado (`fsync`)
4. Substituição atômica via `rename()` (operação atômica do sistema de arquivos)

**Se uma falha ocorrer** durante a escrita:
- O arquivo original permanece íntegro (CA-008)
- A importação é marcada como `failed`
- Arquivos `.tmp` abandonados são limpos na próxima inicialização

### Verificação de Integridade

```bash
# Lista todos os arquivos Markdown e seus metadados
docker compose exec api node -e "
  const fs = require('fs');
  const path = require('path');
  const dir = '/app/data/users';
  
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'clippings.md') {
        const stat = fs.statSync(full);
        const content = fs.readFileSync(full, 'utf-8');
        const match = content.match(/^title: \"(.+?)\"/m);
        const count = (content.match(/<!-- clipping-id:/g) || []).length;
        console.log('----------------------------------------');
        console.log('Arquivo:', full);
        console.log('Título:', match?.[1] || 'N/A');
        console.log('Clippings:', count);
        console.log('Modificado:', stat.mtime.toISOString());
        console.log('Tamanho:', stat.size, 'bytes');
      }
    });
  }
  walk(dir);
  console.log('----------------------------------------');
"
```

---

## Agendamento de Backup

Recomenda-se backup diário do diretório `/data/users` (contém os clippings) e backup semanal do banco SQLite (reconstruível).

### Exemplo com cron (Linux/macOS)

```bash
# Adiciona ao crontab (crontab -e)
# Backup diário dos Markdown (3h da manhã)
0 3 * * * /usr/local/bin/backup-myclippings-markdown.sh

# Backup semanal do SQLite (domingo 4h)
0 4 * * 0 /usr/local/bin/backup-myclippings-sqlite.sh
```

O conteúdo dos scripts deve seguir os procedimentos descritos acima, adaptados ao seu ambiente de execução.

---

## Resumo

| O que | Importância | Reconstruível |
|---|---|---|
| `/data/users/` (Markdown) | **Crítica** — contém os clippings | Não |
| `/data/database/` (SQLite) | Média — usuários e histórico | Parcialmente (via Markdown) |
| `.env` (configuração) | Média — segredos e ajustes | Manualmente |

**Regra de ouro**: Se você só puder fazer backup de uma coisa, faça do diretório `/data/users/`.
