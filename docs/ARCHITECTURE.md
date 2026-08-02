# Architecture Overview

Este documento descreve a arquitetura planejada do **My Clippings** e deve ser mantido atualizado conforme o código e as decisões arquiteturais evoluírem.

O sistema é uma aplicação web para importar arquivos de clippings do Kindle, organizar os registros por livro, armazená-los em arquivos Markdown e disponibilizá-los posteriormente para leitura, busca, cópia, download e geração de imagens de citações no formato 1:1.

A principal decisão arquitetural é que **os clippings não são armazenados no banco de dados**. Os arquivos Markdown são a fonte de verdade para livros e clippings. O SQLite é utilizado apenas para dados relacionais e operacionais que não representam o conteúdo dos clippings, como usuários, autenticação, configurações, histórico de importações e índices reconstruíveis.

## 1. Architectural Principles

### 1.1. Markdown as the source of truth

- Cada livro é representado por um arquivo Markdown.
- Os clippings são lidos diretamente desses arquivos.
- Importações criam ou atualizam os arquivos automaticamente.
- Não existe geração manual de Markdown.
- O arquivo disponibilizado para download é o mesmo utilizado internamente pelo sistema.
- Índices, caches e metadados derivados devem poder ser reconstruídos a partir dos arquivos Markdown.

### 1.2. SQLite does not store clipping content

O SQLite pode armazenar:

- Usuários.
- Credenciais protegidas.
- Configurações.
- Histórico e resultado de importações.
- Índices de arquivos reconstruíveis.

O SQLite não deve armazenar:

- O texto integral dos clippings.
- A coleção de clippings de um livro como registros permanentes.
- Uma cópia alternativa dos arquivos Markdown.

### 1.3. Automatic and idempotent imports

- A importação é responsável por criar e atualizar os arquivos Markdown.
- Reimportar o mesmo arquivo não pode duplicar clippings.
- O sistema deve adicionar apenas os registros ainda inexistentes.
- A deduplicação deve considerar tanto duplicidades no arquivo enviado quanto registros presentes em importações anteriores.

### 1.4. User data isolation

- Cada usuário possui seu próprio espaço de arquivos.
- Um usuário não pode ler, modificar ou baixar arquivos pertencentes a outro usuário.
- Toda operação protegida deve validar a identidade do usuário e a propriedade do recurso.

### 1.5. Derived data is disposable

Índices, caches e resultados intermediários são derivados e não constituem fonte de verdade. Eles podem ser apagados e reconstruídos sem perda dos clippings.

### 1.6. Safe file operations

- Caminhos devem ser construídos apenas após sanitização de títulos e autores.
- Escritas devem ser atômicas.
- Duas importações não podem escrever simultaneamente no mesmo arquivo.
- Uma falha não pode deixar um Markdown parcialmente gravado.

## 2. Project Structure

Estrutura conceitual do monorepo:

```text
my-clippings/
├── apps/
│   ├── web/                        # Aplicação web com TanStack Start
│   │   ├── src/
│   │   │   ├── routes/             # Rotas e telas da aplicação
│   │   │   ├── components/         # Componentes específicos da aplicação
│   │   │   ├── features/           # Funcionalidades agrupadas por domínio
│   │   │   ├── queries/            # Integração com TanStack Query
│   │   │   └── styles/             # Estilos globais e Tailwind CSS
│   │   ├── tests/                  # Testes da aplicação web
│   │   └── Dockerfile
│   │
│   └── api/                        # API HTTP com Fastify
│       ├── src/
│       │   ├── routes/             # Rotas HTTP
│       │   ├── modules/            # Módulos da aplicação
│       │   ├── plugins/            # Plugins do Fastify
│       │   ├── middleware/         # Autenticação, autorização e tratamento
│       │   └── config/             # Configuração e variáveis de ambiente
│       ├── tests/                  # Testes unitários e de integração
│       └── Dockerfile
│
├── packages/
│   ├── database/                   # Drizzle ORM, schema e migrations SQLite
│   ├── domain/                     # Regras de negócio independentes de transporte
│   ├── schemas/                    # Schemas Zod e contratos compartilhados
│   ├── kindle-parser/              # Parser do arquivo My Clippings.txt
│   ├── markdown/                   # Leitura, escrita e validação dos arquivos
│   ├── quote-generator/            # Geração das imagens de citações 1:1
│   ├── ui/                         # Componentes compartilhados com shadcn/ui
│   └── config/                     # Configurações compartilhadas
│
├── data/                           # Apenas para desenvolvimento local
│   ├── database/                   # Arquivo SQLite
│   └── users/                      # Arquivos Markdown por usuário
│
├── tests/
│   ├── fixtures/                   # Arquivos de exemplo do Kindle
│   └── e2e/                        # Testes ponta a ponta com Playwright
│
├── docs/                           # Documentação complementar
├── scripts/                        # Scripts operacionais e de desenvolvimento
├── docker-compose.yml
├── .env.example
├── README.md
└── ARCHITECTURE.md
```

A estrutura é conceitual. Nomes exatos de diretórios podem evoluir, desde que a separação de responsabilidades seja preservada.

## 3. High-Level System Diagram

```text
┌──────────────┐
│   Usuário    │
└──────┬───────┘
       │ HTTPS
       ▼
┌───────────────────────────────┐
│ Web App                       │
│ TanStack Start + React        │
│ Tailwind CSS + shadcn/ui      │
│ TanStack Query                │
└──────────────┬────────────────┘
               │ HTTP/JSON
               ▼
┌───────────────────────────────┐
│ API                           │
│ Fastify + TypeScript + Zod    │
│ Autenticação JWT              │
└───────┬───────────────┬───────┘
        │               │
        │               │
        ▼               ▼
┌───────────────┐  ┌─────────────────────────┐
│ SQLite       │  │ Sistema de arquivos     │
│              │  │                         │
│ - usuários   │  │ - Markdown por livro   │
│ - sessões    │  │ - arquivos temporários │
│ - settings   │  │ - artefatos derivados  │
│ - imports    │  │                         │
│ - índices    │  │ Fonte de verdade dos   │
│   derivados  │  │ livros e clippings     │
└───────────────┘  └─────────────────────────┘
```

## 4. Main Data Flows

### 4.1. Authentication flow

```text
Usuário
  -> Web App
  -> API de autenticação
  -> Validação Zod
  -> Consulta ao SQLite
  -> Validação de senha
  -> Emissão de JWT
  -> Sessão autenticada
```

O armazenamento do token no navegador deve seguir as regras de segurança da spec, preferencialmente utilizando cookie `HttpOnly`, `Secure` em HTTPS e `SameSite` adequado.

### 4.2. Import flow

```text
Arquivo My Clippings.txt
  -> Upload pela Web App
  -> Validação de arquivo na API
  -> Parser de clippings
  -> Normalização de livros e registros
  -> Agrupamento por livro
  -> Leitura dos Markdown existentes
  -> Cálculo e comparação de fingerprints
  -> Remoção de duplicidades
  -> Geração do novo conteúdo Markdown
  -> Validação do conteúdo gerado
  -> Escrita em arquivo temporário
  -> Substituição atômica do arquivo final
  -> Atualização do índice reconstruível
  -> Registro do resultado da importação
  -> Resposta para a Web App
```

### 4.3. Book listing flow

```text
Web App
  -> API de livros
  -> Índice reconstruível
  -> Lista paginada de livros
  -> Web App
```

A listagem não deve exigir a leitura integral de todos os arquivos Markdown a cada requisição.

### 4.4. Book reading flow

```text
Web App
  -> API de livro
  -> Validação de autenticação e propriedade
  -> Resolução segura do caminho
  -> Leitura do Markdown do livro
  -> Parser de Markdown
  -> Filtros e ordenação
  -> Resposta paginada ou estruturada
  -> Web App
```

### 4.5. Markdown download flow

```text
Web App
  -> API de download
  -> Validação de autenticação e propriedade
  -> Resolução segura do caminho
  -> Leitura do arquivo Markdown original
  -> Download
```

Não há uma etapa de geração manual nesse fluxo.

### 4.6. Quote image flow

```text
Web App
  -> Seleção de um clipping
  -> Configuração visual
  -> API ou módulo de geração
  -> Renderização 1:1
  -> Pré-visualização
  -> Download da imagem
```

A resolução padrão é 1080 × 1080 pixels e o formato obrigatório é PNG. A persistência permanente das imagens não é uma exigência arquitetural da spec.

## 5. Core Components

### 5.1. Web Application

**Name:** My Clippings Web App

**Responsibility:**

- Cadastro, login e logout.
- Listagem e busca de livros.
- Leitura e filtro de clippings.
- Upload de arquivos do Kindle.
- Exibição do resultado de importações.
- Cópia de clippings para o clipboard.
- Download de Markdown.
- Configuração e geração de imagens de citações.
- Gerenciamento da conta e preferências.

**Technologies:**

- TanStack Start.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- TanStack Query.
- Zod.

**Deployment:**

Container Docker. O provedor ou ambiente final de hospedagem não está definido na spec.

### 5.2. HTTP API

**Name:** My Clippings API

**Responsibility:**

- Expor os casos de uso por HTTP.
- Validar entradas e respostas.
- Autenticar usuários com JWT.
- Autorizar acesso por proprietário.
- Coordenar importações.
- Consultar e atualizar o SQLite.
- Ler e gravar os arquivos Markdown.
- Fornecer downloads.
- Gerar imagens de citações.
- Produzir logs estruturados e health checks.

**Technologies:**

- Node.js 22 LTS.
- TypeScript.
- Fastify.
- Zod.
- JWT.
- Drizzle ORM.
- SQLite.

**Deployment:**

Container Docker executado em conjunto com a aplicação web pelo Docker Compose.

### 5.3. Kindle Parser

**Name:** Kindle Clippings Parser

**Responsibility:**

- Ler `My Clippings.txt`.
- Separar registros individuais.
- Reconhecer destaques, notas e marcadores.
- Extrair título, autor, página, localização e data quando disponíveis.
- Preservar o conteúdo original.
- Suportar `LF`, `CRLF`, UTF-8 e UTF-8 com BOM.
- Aceitar registros com metadados opcionais ausentes.
- Produzir uma representação normalizada para o domínio.

**Boundary:**

Não grava diretamente no banco nem no sistema de arquivos. Entrega registros estruturados ao caso de uso de importação.

### 5.4. Import Service

**Name:** Clippings Import Service

**Responsibility:**

- Validar o arquivo recebido.
- Executar o parser.
- Agrupar clippings por livro.
- Resolver a identidade de cada livro.
- Ler arquivos existentes.
- Calcular fingerprints.
- Remover duplicidades.
- Coordenar locks de escrita.
- Criar ou atualizar os Markdown.
- Atualizar índices derivados.
- Registrar o resultado da importação.

**Transactional boundary:**

O SQLite e o sistema de arquivos não formam uma única transação ACID. Portanto, o fluxo deve ser ordenado para que o arquivo Markdown seja a referência final de sucesso. Um registro de importação só deve ser marcado como concluído após todas as escritas necessárias terem sido confirmadas.

### 5.5. Markdown Repository

**Name:** Markdown Book Repository

**Responsibility:**

- Resolver caminhos por usuário e livro.
- Ler front matter e seções de clippings.
- Validar a versão do schema do arquivo.
- Converter Markdown em estruturas de domínio.
- Serializar livros e clippings de maneira determinística.
- Executar escritas atômicas.
- Disponibilizar o arquivo original para download.
- Detectar arquivos novos, alterados, removidos ou inválidos.

**Source of truth:**

Este componente representa o armazenamento primário de livros e clippings.

### 5.6. Deduplication Service

**Name:** Clipping Fingerprint Service

**Responsibility:**

- Normalizar campos utilizados na comparação.
- Calcular um identificador determinístico para cada clipping.
- Comparar registros importados com registros já persistidos.
- Impedir duplicidades no mesmo upload e entre uploads diferentes.

**Fingerprint inputs:**

- Identificador do livro.
- Tipo.
- Conteúdo normalizado.
- Página.
- Localização inicial.
- Localização final.
- Data original do Kindle.

O conteúdo original deve permanecer inalterado no Markdown.

### 5.7. File Index

**Name:** Rebuildable File Index

**Responsibility:**

- Acelerar a listagem de livros.
- Armazenar metadados derivados dos arquivos.
- Detectar alterações por hash, tamanho ou data de modificação.
- Permitir paginação e ordenação sem interpretar todos os Markdown a cada requisição.
- Ser reconstruído a partir do diretório de arquivos.

**Restrictions:**

- Não é fonte de verdade.
- Não deve armazenar o conteúdo integral dos clippings.
- Uma falha ou remoção do índice não pode causar perda de dados.

### 5.8. Quote Generator

**Name:** Social Quote Generator

**Responsibility:**

- Receber um clipping e suas configurações visuais.
- Produzir pré-visualização.
- Gerar imagem PNG em proporção 1:1.
- Usar resolução padrão de 1080 × 1080 pixels.
- Preservar legibilidade, margens, contraste e quebra de linha.
- Não cortar silenciosamente textos longos.

### 5.9. Authentication and User Management

**Responsibility:**

- Cadastro de usuário.
- Login e logout.
- Hash seguro de senhas.
- Emissão e validação de JWT.
- Alteração de dados e senha.
- Exclusão da conta e de seus arquivos.
- Isolamento dos recursos por usuário.

## 6. Data Stores

### 6.1. Markdown File Store

**Name:** User Book Files

**Type:** Arquivos Markdown em sistema de arquivos persistente.

**Purpose:**

- Armazenar livros e clippings.
- Servir como fonte de leitura da aplicação.
- Permitir download direto pelo usuário.
- Permitir reconstrução de índices derivados.

**Conceptual path:**

```text
/data/users/
└── {user-id}/
    └── books/
        └── {author-slug}/
            └── {title-slug}-{book-id}/
                └── clippings.md
```

O caminho exato pode variar, mas deve preservar:

- Separação por usuário.
- Identificador estável para evitar colisões.
- Nomes sanitizados.
- Compatibilidade entre Linux, macOS e Windows.

### 6.2. Markdown Schema

Cada arquivo deve possuir uma versão explícita de schema e metadados estruturados.

Exemplo conceitual:

```markdown
---
schemaVersion: 1
bookId: "stable-book-id"
title: "Nome do livro"
author: "Nome do autor"
createdAt: "2026-07-25T10:00:00-03:00"
updatedAt: "2026-07-25T10:30:00-03:00"
clippingCount: 1
---

# Nome do livro

**Autor:** Nome do autor

## Clippings

### Destaque

<!-- clipping-id: sha256:fingerprint -->

> Conteúdo original do clipping.

- Tipo: destaque
- Página: 10
- Localização: 135-138
- Data do Kindle: 2026-07-20T21:30:00-03:00
```

A representação final deve ser determinística e interpretável pela aplicação.

### 6.3. SQLite Database

**Name:** Application Database

**Type:** SQLite acessado por Drizzle ORM.

**Purpose:**

- Autenticação e usuários.
- Configurações.
- Histórico operacional de importações.
- Índices reconstruíveis.

**Conceptual tables:**

#### `users`

- `id`
- `name`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

#### `imports`

- `id`
- `user_id`
- `filename`
- `file_hash`
- `status`
- `total_records`
- `imported_records`
- `duplicate_records`
- `invalid_records`
- `started_at`
- `completed_at`
- `error_message`

#### `user_settings`

- `id`
- `user_id`
- `interface_preferences`
- `quote_preferences`
- `created_at`
- `updated_at`

#### `file_index`

- `user_id`
- `book_id`
- `relative_path`
- `title`
- `author`
- `clipping_count`
- `file_hash`
- `file_modified_at`
- `indexed_at`

O schema definitivo será implementado por migrations versionadas.

### 6.4. Persistent Volumes

```text
/data/database    # SQLite
/data/users       # Markdown dos usuários
```

Os volumes devem sobreviver à remoção e recriação dos containers.

## 7. API Boundaries

A lista abaixo representa capacidades da API, não uma definição definitiva de rotas ou verbos HTTP.

### 7.1. Authentication

- Cadastrar usuário.
- Autenticar usuário.
- Encerrar sessão.
- Consultar e alterar conta.
- Alterar senha.
- Excluir conta.

### 7.2. Imports

- Enviar arquivo do Kindle.
- Consultar o resultado da importação.
- Consultar histórico de importações.

### 7.3. Books

- Listar livros.
- Buscar e filtrar livros.
- Obter metadados de um livro.
- Ler clippings de um livro.
- Baixar o Markdown de um livro.
- Baixar múltiplos arquivos em formato compactado, quando implementado.

### 7.4. Clippings

- Obter um clipping.
- Filtrar e ordenar clippings.
- Obter representação apropriada para cópia.

A edição e exclusão de clippings exigem reescrita do arquivo Markdown. A inclusão dessas operações no MVP deve seguir a definição final do escopo funcional.

### 7.5. Quotes

- Gerar pré-visualização.
- Gerar imagem PNG 1:1.

### 7.6. Settings

- Consultar configurações.
- Atualizar preferências de interface e de geração de imagem.

## 8. Consistency and Failure Handling

### 8.1. Atomic Markdown update

A atualização de um arquivo deve seguir este processo:

1. Ler e validar o arquivo atual, quando existente.
2. Gerar o novo conteúdo em memória ou arquivo temporário.
3. Validar o Markdown gerado.
4. Gravar um arquivo temporário no mesmo volume do destino.
5. Sincronizar a escrita quando aplicável.
6. Substituir atomicamente o arquivo anterior.
7. Atualizar o índice derivado.
8. Marcar a operação como concluída.

### 8.2. File locking

O sistema deve impedir escritas concorrentes no mesmo livro. A estratégia concreta de lock não está definida na spec, mas deve operar no mínimo por usuário ou por livro.

### 8.3. Import status

Estados operacionais recomendados pela própria necessidade da spec:

```text
pending -> processing -> completed
                     \-> failed
```

Uma importação não pode ser considerada concluída antes que todos os arquivos afetados estejam íntegros.

### 8.4. Startup recovery

Na inicialização, a API deve:

1. Validar as variáveis obrigatórias.
2. Verificar acesso ao SQLite.
3. Verificar acesso aos diretórios persistentes.
4. Aplicar ou validar migrations.
5. Detectar arquivos temporários abandonados.
6. Comparar arquivos com o índice existente.
7. Reindexar arquivos novos ou alterados.
8. Registrar arquivos inválidos nos logs.

### 8.5. Index reconstruction

A reconstrução do índice deve:

1. Percorrer os diretórios dos usuários.
2. Localizar arquivos Markdown reconhecidos.
3. Ler front matter e metadados necessários.
4. Validar a versão do schema.
5. Atualizar o índice SQLite.
6. Isolar e registrar erros sem apagar o arquivo original.

## 9. Security Considerations

### 9.1. Authentication

- JWT com prazo de expiração.
- Senhas armazenadas apenas como hash adaptativo seguro, como Argon2id ou equivalente.
- Tokens, senhas e segredos não podem aparecer em logs.

### 9.2. Authorization

- Toda rota protegida deve validar a identidade do usuário.
- Toda leitura e escrita deve validar a propriedade do recurso.
- A autorização não pode depender apenas de controles do frontend.

### 9.3. File-system security

- Títulos e autores nunca devem ser utilizados diretamente como caminho.
- Separadores, caracteres de controle, nomes reservados e sequências como `../` devem ser rejeitados ou normalizados.
- O caminho final deve permanecer dentro do diretório designado para o usuário.
- Downloads não podem aceitar caminhos arbitrários fornecidos pelo cliente.

### 9.4. Input validation

- Requisições devem ser validadas com Zod.
- Uploads devem possuir limite de tamanho configurável.
- Arquivos inválidos não devem ser processados como importações concluídas.
- Erros internos e stack traces não devem ser expostos em produção.

### 9.5. Web security

A aplicação deve adotar proteção contra:

- Injeção SQL.
- Cross-site scripting.
- Cross-site request forgery quando aplicável.
- Path traversal.
- Uploads maliciosos.
- Força bruta em autenticação.

### 9.6. Rate limiting

Rotas de autenticação e importação devem possuir limites configuráveis.

### 9.7. Transport security

O ambiente de produção deve utilizar HTTPS. A terminação TLS pode ser realizada fora dos containers da aplicação.

### 9.8. Secrets

- Segredos devem ser fornecidos por variáveis de ambiente ou mecanismo equivalente.
- O repositório deve conter apenas `.env.example` sem valores reais.

## 10. Performance and Capacity

Metas iniciais da spec:

- Até 5.000 livros por usuário.
- Até 100.000 clippings por usuário.
- Uploads configuráveis, com limite máximo inicial de até 50 MB.
- Consultas paginadas com 95% das respostas em até 2 segundos em condições normais.
- Importação de arquivo de até 10 MB em até 30 segundos no ambiente mínimo recomendado.
- Geração de imagem em até 5 segundos em condições normais.

### 10.1. Performance strategy

- Listagens usam o índice reconstruível.
- A leitura de um livro acessa apenas seu arquivo.
- O frontend não carrega todos os clippings de uma vez.
- Busca global pode usar um índice derivado.
- Caches são invalidados após importações ou mudanças detectadas nos arquivos.

### 10.2. Concurrency strategy

- Restrições de unicidade protegem dados no SQLite.
- Locks protegem arquivos Markdown.
- Importações concorrentes não podem produzir clippings duplicados.

## 11. Observability

### 11.1. Structured logs

A API deve registrar:

- Nível.
- Data e hora.
- Identificador de correlação.
- Rota.
- Status HTTP.
- Duração.
- Tipo de erro.
- Resultado quantitativo de importações.

O conteúdo integral dos clippings não deve ser registrado por padrão.

### 11.2. Correlation

Cada requisição deve possuir um identificador capaz de correlacionar eventos entre frontend, API e logs.

### 11.3. Health checks

A API deve disponibilizar verificações separadas para:

- Processo ativo.
- Aplicação pronta para receber tráfego.
- Acesso ao SQLite.
- Acesso aos diretórios persistentes.

### 11.4. Operational metrics

No mínimo por logs:

- Duração das importações.
- Quantidade de registros processados.
- Quantidade de registros importados.
- Quantidade de duplicados.
- Quantidade de inválidos.
- Quantidade de falhas.
- Tempo de resposta das principais rotas.

## 12. Deployment and Infrastructure

### 12.1. Runtime

- Node.js 22 LTS.
- Containers Docker.
- Docker Compose para execução conjunta.
- NVM para selecionar a versão do node com base no resgistro em .nvmrc
- PNPM como gerenciador de dependências (utilizar em vez do npm).

### 12.2. Services

```text
Docker Compose
├── web
│   └── TanStack Start
└── api
    ├── Fastify
    ├── SQLite volume
    └── User files volume
```

A separação do SQLite em um serviço próprio não se aplica, pois ele é um arquivo acessado pela API.

### 12.3. Volumes

Exemplo conceitual:

```yaml
services:
  api:
    volumes:
      - database-data:/data/database
      - user-files:/data/users

volumes:
  database-data:
  user-files:
```

### 12.4. Container requirements

- Build em múltiplos estágios.
- Imagens base com versões definidas.
- Execução como usuário não root.
- Apenas dependências de produção na imagem final.
- Health checks.
- Encerramento gracioso.

### 12.5. Configuration

Configurações devem ser fornecidas por variáveis de ambiente. A spec exige um `.env.example` sem segredos reais.

### 12.6. Hosting

O provedor, a infraestrutura de nuvem e o pipeline de entrega não estão definidos. Armazenamento gerenciado em AWS, Google Cloud ou serviços equivalentes está fora do escopo inicial.

## 13. Development and Testing Environment

### 13.1. Code quality

- TypeScript em modo estrito.
- ESLint para análise estática.
- Biome para formatação e organização de imports.
- Responsabilidades de ESLint e Biome sem sobreposição conflitante.

### 13.2. Unit tests

Vitest deve cobrir principalmente:

- Parser do Kindle.
- Normalização.
- Fingerprints.
- Deduplicação.
- Serialização e parsing de Markdown.
- Sanitização de caminhos.
- Regras de domínio.

### 13.3. Integration tests

Vitest deve cobrir:

- SQLite e migrations.
- API.
- Autenticação e autorização.
- Importação.
- Deduplicação contra arquivos existentes.
- Escrita atômica.
- Reconstrução do índice.
- Download do arquivo original.

### 13.4. End-to-end tests

Playwright deve cobrir:

1. Cadastro.
2. Login.
3. Upload de `My Clippings.txt`.
4. Visualização do resultado da importação.
5. Listagem de livros.
6. Leitura e filtro de clippings.
7. Cópia para o clipboard.
8. Download do Markdown.
9. Geração de imagem 1:1.
10. Reimportação sem duplicidade.
11. Persistência após reinicialização dos containers.

### 13.5. Test fixtures

Os testes devem utilizar arquivos de exemplo contendo:

- Quebras de linha `LF` e `CRLF`.
- UTF-8 com e sem BOM.
- Múltiplos livros.
- Diferentes tipos de clipping.
- Metadados opcionais ausentes.
- Duplicidades no mesmo arquivo.
- Duplicidades em importações posteriores.
- Registros inválidos.

### 13.6. Quality gate

O pipeline deve executar:

- Verificação de tipos.
- Lint.
- Verificação de formatação.
- Testes unitários.
- Testes de integração.
- Build.
- Testes ponta a ponta quando aplicável.

A tecnologia do pipeline de CI/CD não está definida na spec.

## 14. Backup and Restore

### 14.1. Required backup targets

- Arquivo SQLite.
- Diretório `/data/users`.
- Configurações necessárias para restauração.

### 14.2. Restore invariant

A restauração do diretório Markdown deve permitir reconstruir todos os livros e clippings, mesmo que o índice SQLite tenha sido perdido.

### 14.3. Backup consistency

Como SQLite e arquivos Markdown são armazenamentos separados, o procedimento operacional deve evitar capturar um arquivo enquanto ele está sendo substituído. A estratégia concreta de snapshot não está definida na spec e deve ser documentada na implantação.

## 15. Accessibility and User Experience

- Interface responsiva a partir de 360 pixels.
- Navegação principal utilizável por teclado.
- HTML semântico.
- Indicadores de foco visíveis.
- Contraste adequado.
- Mensagens de erro associadas aos campos.
- Estados explícitos de carregamento, erro, vazio, sem resultado, não autorizado e não encontrado.
- Feedback de sucesso ou falha para importação, cópia, download e geração de imagem.
- Meta de conformidade com WCAG 2.1 nível AA.

## 16. External Integrations

### 16.1 OpenLibrary Covers API

O sistema integra com a **OpenLibrary Covers API** para enriquecer livros com capas automaticamente durante a importação.

- **Endpoint de busca**: `https://openlibrary.org/search.json?q={title}+{author}&limit=1`
- **URL da capa**: `https://covers.openlibrary.org/b/id/{coverId}-M.jpg`
- **Tamanho padrão**: Medium (M) — adequado para exibição em lista e página de detalhes
- **Comportamento**: Best-effort — falhas de rede ou ausência de resultados não bloqueiam a importação
- **Cache**: A capa é armazenada como URL no front matter do Markdown e na tabela `file_index` do SQLite
- **Idempotência**: A busca é feita apenas quando o livro não possui capa existente (não sobrescreve capas já definidas)

**Fluxo de enriquecimento:**

```
Import handler → processa livro → (sem capa?) → fetchBookCover(title, author) → armazena coverUrl
                                                                                     ├── Markdown (front matter)
                                                                                     └── file_index.cover_url
```

**Módulo responsável**: `apps/api/src/lib/openlibrary.ts`

A versão inicial não depende de outras integrações externas para obter clippings.

Fora do escopo:

- Sincronização automática com Kindle.
- Integração oficial com APIs da Amazon.
- Armazenamento em AWS, Google Cloud, Azure ou serviços equivalentes.
- Publicação automática em redes sociais.
- Serviços de envio de e-mail, salvo decisão futura para recuperação de senha.

## 17. Architectural Constraints

- Monorepo.
- Node.js 22 LTS.
- TypeScript.
- NVM.
- PNPM.
- SQLite.
- Drizzle ORM.
- Fastify.
- JWT.
- TanStack Start [https://tanstack.com/start/latest].
- React.
- TanStack Query.
- Zod.
- Tailwind CSS.
- shadcn/ui.
- Docker.
- Docker Compose.
- Vitest.
- Playwright.
- ESLint.
- Biome.

## 18. Out of Scope

- Sincronização com o dispositivo ou conta Kindle.
- Aplicativos nativos Android e iOS.
- Aplicativo desktop.
- Extensão de navegador.
- Armazenamento gerenciado em nuvem.
- Colaboração entre usuários.
- Compartilhamento público.
- Edição colaborativa em tempo real.
- OCR.
- Importação de outros formatos de e-book.
- Publicação automática em redes sociais.

## 19. Open Decisions

Os seguintes pontos não estão definidos pela spec e não devem ser assumidos durante a implementação sem uma decisão explícita:

- Gerenciador de pacotes do monorepo.
- Orquestrador de tarefas do monorepo.
- Convenção definitiva de rotas HTTP.
- Estratégia concreta de lock de arquivos.
- Biblioteca utilizada para front matter e parsing de Markdown.
- Biblioteca ou mecanismo de renderização de imagens.
- Política definitiva para edição manual de arquivos no volume.
- Estratégia de busca global e indexação textual.
- Estratégia de refresh ou renovação de JWT.
- Provedor de hospedagem.
- Plataforma de CI/CD.
- Política de retenção do histórico de importações.
- Inclusão de edição e exclusão de clippings no MVP.

## 20. Future Considerations

Possibilidades futuras já compatíveis com a arquitetura, mas não incluídas no escopo inicial:

- Novas versões do schema Markdown.
- Migração automática de arquivos antigos.
- Download de todos os livros em arquivo compactado.
- Novas resoluções e formatos de imagem.
- Índice de busca textual reconstruível.
- Novos formatos de importação.
- Sincronização externa, caso futuramente aprovada.

Qualquer evolução deve preservar ou migrar explicitamente os arquivos Markdown, pois eles são a fonte de verdade dos clippings.

## 21. Project Identification

- **Project name:** My Clippings
- **Architecture status:** Proposed
- **Repository URL:** Not specified
- **Primary team:** Not specified
- **Last updated:** 2026-07-25

## 22. Glossary

**Clipping:** Destaque, nota ou marcador extraído do arquivo do Kindle.

**Book Markdown:** Arquivo Markdown que representa um livro e contém seus clippings.

**Fingerprint:** Identificador determinístico utilizado para detectar um clipping já importado.

**Source of truth:** Armazenamento considerado autoritativo para reconstruir o estado do sistema.

**Derived index:** Estrutura de consulta reconstruível a partir dos arquivos Markdown.

**Atomic write:** Estratégia que substitui o arquivo final apenas depois que o novo conteúdo foi gravado e validado com sucesso.

**Front matter:** Bloco de metadados estruturados localizado no início do arquivo Markdown.

**Idempotent import:** Importação que pode ser executada novamente sem duplicar dados já persistidos.

**My Clippings.txt:** Arquivo gerado pelo Kindle contendo destaques, notas e marcadores.

## 23. Maintenance Rule

Este documento é um artefato vivo. Ele deve ser atualizado sempre que uma mudança alterar:

- A fonte de verdade dos dados.
- A estrutura do monorepo.
- Os limites entre componentes.
- Os fluxos de importação ou leitura.
- O schema Markdown.
- O schema SQLite.
- A estratégia de segurança.
- A estratégia de implantação.
- As restrições técnicas do projeto.
