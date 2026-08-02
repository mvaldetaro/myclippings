O **Markdown passa a ser a fonte de verdade dos clippings**, e não apenas um artefato de exportação. O SQLite permanece para autenticação, configurações e controle operacional, mas não armazena o conteúdo dos clippings.

# Alterações na especificação — Persistência em Markdown

## 1. Decisão arquitetural

Os clippings não deverão ser armazenados no banco de dados.

Após a importação do arquivo do Kindle, o sistema deverá gerar ou atualizar automaticamente um arquivo Markdown para cada livro identificado.

Os arquivos Markdown serão a fonte primária de dados para:

- Listagem dos livros.
- Leitura dos clippings.
- Busca e filtragem.
- Identificação de duplicidades.
- Cópia para o clipboard.
- Geração de imagens de citações.
- Download dos clippings.

Não haverá funcionalidade de geração manual de Markdown.

---

## 2. Objetivo revisado

O objetivo do projeto é criar uma aplicação web que permita importar clippings do Kindle, organizá-los por livro e armazená-los em arquivos Markdown estruturados.

A aplicação deverá utilizar esses arquivos para apresentar posteriormente os livros e clippings na interface web, sem armazenar o conteúdo dos clippings em banco de dados.

O usuário também deverá poder baixar o arquivo Markdown correspondente a cada livro.

---

## 3. Premissas revisadas

- A fonte inicial dos dados será o arquivo `My Clippings.txt` do Kindle.
- Cada livro será representado por um arquivo Markdown.
- Os arquivos Markdown serão a fonte de verdade dos livros e clippings importados.
- O banco SQLite não armazenará o conteúdo dos clippings.
- A aplicação deverá conseguir reconstruir seus índices internos a partir dos arquivos Markdown.
- Os arquivos Markdown deverão ser legíveis tanto pela aplicação quanto por pessoas.
- A geração ou atualização dos arquivos ocorrerá automaticamente durante a importação.
- Não haverá ação de geração manual de Markdown.
- O usuário poderá baixar o arquivo Markdown de um livro.
- Os arquivos deverão ser armazenados em volume persistente quando a aplicação estiver sendo executada em Docker.

---

## 4. Fluxo principal revisado

O fluxo de importação deverá ser:

1. O usuário envia um arquivo `My Clippings.txt`.
2. O sistema valida o arquivo.
3. O sistema separa os registros encontrados.
4. O sistema normaliza títulos, autores e clippings.
5. O sistema identifica o arquivo Markdown correspondente a cada livro.
6. O sistema lê os clippings já existentes nesse arquivo.
7. O sistema identifica registros duplicados.
8. O sistema adiciona somente os novos clippings.
9. O sistema reescreve de forma atômica os arquivos Markdown afetados.
10. O sistema atualiza seus índices de leitura e busca.
11. O sistema apresenta o resultado da importação.

---

## 5. Requisitos funcionais revisados

### RF-001 — Importar arquivo do Kindle

O usuário deverá poder enviar um arquivo de clippings exportado pelo Kindle.

### RF-002 — Validar arquivo

O sistema deverá validar:

- Tamanho do arquivo.
- Codificação.
- Formato.
- Presença de registros reconhecíveis.
- Integridade mínima dos clippings.

### RF-003 — Processar clippings

O sistema deverá identificar, quando disponíveis:

- Título do livro.
- Autor.
- Tipo do clipping.
- Conteúdo.
- Página.
- Localização.
- Data registrada pelo Kindle.

### RF-004 — Agrupar por livro

O sistema deverá agrupar os clippings pela combinação normalizada de título e autor.

### RF-005 — Criar Markdown automaticamente

Quando um livro ainda não possuir arquivo Markdown, o sistema deverá criá-lo automaticamente durante a importação.

### RF-006 — Atualizar Markdown automaticamente

Quando o livro já possuir um arquivo Markdown, o sistema deverá adicionar somente os clippings que ainda não estiverem presentes.

### RF-007 — Não oferecer geração manual

A interface não deverá disponibilizar uma ação para gerar ou regenerar manualmente os arquivos Markdown.

A criação e atualização dos arquivos será uma responsabilidade automática do processo de importação.

### RF-008 — Identificar clippings duplicados

O sistema deverá comparar os registros importados com os clippings presentes nos arquivos Markdown.

Clippings já existentes não deverão ser adicionados novamente.

### RF-009 — Reimportar o mesmo arquivo

Quando o usuário enviar novamente um arquivo já processado, o sistema deverá:

- Processar o arquivo normalmente.
- Identificar os clippings existentes.
- Não adicionar registros duplicados.
- Informar a quantidade de registros ignorados.

### RF-010 — Ler livros a partir do sistema de arquivos

O sistema deverá identificar os livros disponíveis por meio dos arquivos Markdown pertencentes ao usuário.

### RF-011 — Listar livros

A interface deverá apresentar os livros encontrados no diretório do usuário.

Cada livro deverá apresentar, no mínimo:

- Título.
- Autor.
- Quantidade de clippings.
- Data da última alteração.
- Tipos de clipping existentes.

### RF-012 — Ler clippings de um livro

Ao abrir um livro, o sistema deverá ler e interpretar seu arquivo Markdown.

### RF-013 — Filtrar clippings

O usuário deverá poder filtrar os clippings por:

- Texto.
- Tipo.
- Página.
- Localização.
- Data.

### RF-014 — Visualizar clipping

O usuário deverá poder visualizar individualmente o conteúdo e os metadados de um clipping.

### RF-015 — Copiar clipping

O usuário deverá poder copiar um clipping individual para o clipboard.

### RF-016 — Copiar clippings de um livro

O usuário deverá poder copiar todos os clippings de um livro para o clipboard.

### RF-017 — Copiar livro em Markdown

O usuário deverá poder copiar o conteúdo Markdown completo de um livro para o clipboard.

### RF-018 — Baixar arquivo Markdown

O usuário deverá poder baixar o arquivo Markdown correspondente a um livro.

O arquivo disponibilizado para download deverá ser o mesmo utilizado internamente pelo sistema.

### RF-019 — Baixar todos os livros

O usuário poderá baixar todos os arquivos Markdown em um arquivo compactado.

Esse requisito poderá ser tratado como funcionalidade posterior ao MVP.

### RF-020 — Gerar imagem de citação

O usuário deverá poder gerar uma imagem no formato 1:1 a partir de um clipping lido do arquivo Markdown.

---

## 6. Estrutura dos arquivos

Os arquivos deverão ser armazenados em uma estrutura determinística:

```text
/data/
  users/
    {user-id}/
      books/
        {autor-normalizado}/
          {titulo-normalizado}-{book-id}/
            clippings.md
```

O identificador interno do livro deverá impedir colisões entre:

- Livros com o mesmo título.
- Livros de autores diferentes com o mesmo título.
- Variações de normalização que resultem no mesmo nome de diretório.

Nenhum valor recebido do arquivo importado poderá ser utilizado diretamente como caminho sem sanitização.

---

## 7. Formato do Markdown

O formato deverá ser simultaneamente:

- Legível por pessoas.
- Determinístico.
- Interpretável pela aplicação.
- Compatível com futuras versões.
- Adequado para download e uso externo.

Exemplo:

```markdown
---
schemaVersion: 1
bookId: "01J3MYCLIPPINGS001"
title: "Nome do livro"
author: "Nome do autor"
coverUrl: "https://covers.openlibrary.org/b/id/12345678-M.jpg"
createdAt: "2026-07-25T10:00:00-03:00"
updatedAt: "2026-07-25T10:30:00-03:00"
clippingCount: 2
---

# Nome do livro

**Autor:** Nome do autor

## Clippings

### Destaque

<!-- clipping-id: sha256:a12b34c56d -->

> Conteúdo do destaque.

- Tipo: destaque
- Página: 10
- Localização: 135-138
- Data do Kindle: 2026-07-20T21:30:00-03:00

---

### Nota

<!-- clipping-id: sha256:e78f90a12b -->

> Conteúdo da nota.

- Tipo: nota
- Página: 15
- Localização: 200
- Data do Kindle: 2026-07-21T18:45:00-03:00
```

O front matter deverá armazenar os metadados do livro e a versão do schema.

Cada clipping deverá possuir um identificador determinístico que permita:

- Detectar duplicidades.
- Localizar um clipping.
- Manter compatibilidade entre importações.
- Reconstruir índices internos.

---

## 8. Identificação de duplicidades

### RN-001 — Fingerprint do clipping

O identificador de um clipping deverá ser calculado a partir da combinação normalizada de:

- Identificador do livro.
- Tipo.
- Conteúdo.
- Página.
- Localização inicial.
- Localização final.
- Data registrada pelo Kindle.

O identificador poderá utilizar SHA-256 ou algoritmo equivalente.

### RN-002 — Comparação com Markdown

Antes de adicionar um clipping, o sistema deverá verificar os identificadores existentes no arquivo Markdown do livro.

### RN-003 — Duplicidade no mesmo arquivo

Quando o arquivo importado contiver o mesmo clipping mais de uma vez, somente uma ocorrência deverá ser adicionada.

### RN-004 — Duplicidade entre importações

Quando o clipping já estiver presente no Markdown, ele deverá ser ignorado.

### RN-005 — Conteúdo original

A normalização usada para identificação não deverá modificar o conteúdo apresentado ao usuário.

O texto original deverá ser preservado no Markdown.

---

## 9. Banco de dados revisado

O SQLite não deverá armazenar o conteúdo dos livros ou clippings.

Poderá armazenar apenas informações operacionais, como:

### User

- `id`
- `name`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

### Import

- `id`
- `userId`
- `filename`
- `fileHash`
- `status`
- `totalRecords`
- `importedRecords`
- `duplicateRecords`
- `invalidRecords`
- `startedAt`
- `completedAt`
- `errorMessage`

### UserSettings

- `id`
- `userId`
- `interfacePreferences`
- `quotePreferences`
- `createdAt`
- `updatedAt`

### FileIndex

Índice opcional e reconstruível para melhorar o desempenho:

- `userId`
- `bookId`
- `relativePath`
- `title`
- `author`
- `clippingCount`
- `fileHash`
- `fileModifiedAt`
- `indexedAt`

O índice não será a fonte de verdade.

Caso o índice seja apagado ou fique inconsistente, o sistema deverá conseguir reconstruí-lo lendo os arquivos Markdown.

O índice não deverá conter o conteúdo completo dos clippings.

---

## 10. Leitura e indexação

### RNF-001 — Fonte de verdade

Os arquivos Markdown serão a fonte de verdade dos livros e clippings.

### RNF-002 — Índice reconstruível

Qualquer índice armazenado em SQLite ou memória deverá ser considerado cache.

O sistema deverá possuir um processo capaz de reconstruí-lo a partir dos arquivos.

### RNF-003 — Detecção de alterações

O sistema deverá detectar quando um arquivo Markdown tiver sido alterado desde a última indexação.

A detecção poderá utilizar:

- Data de modificação.
- Tamanho do arquivo.
- Hash do conteúdo.

### RNF-004 — Alterações externas

Caso o usuário altere manualmente um arquivo Markdown no volume, o sistema deverá:

- Tentar interpretar o arquivo novamente.
- Atualizar o índice.
- Informar erros de formatação quando o arquivo não puder ser interpretado.

A primeira versão poderá considerar esses arquivos como somente leitura externa, desde que essa restrição seja documentada.

### RNF-005 — Inicialização

Na inicialização, o sistema deverá:

1. Verificar o diretório de dados.
2. Localizar os arquivos Markdown dos usuários.
3. Comparar os arquivos com o índice existente.
4. Indexar arquivos novos ou alterados.
5. Informar arquivos inválidos nos logs.

---

## 11. Integridade dos arquivos

### RNF-006 — Escrita atômica

A atualização de um Markdown deverá utilizar o seguinte processo:

1. Ler o arquivo atual.
2. Gerar o novo conteúdo em memória ou arquivo temporário.
3. Validar o conteúdo gerado.
4. Gravar em um arquivo temporário no mesmo volume.
5. Sincronizar a escrita, quando aplicável.
6. Substituir atomicamente o arquivo anterior.

Uma falha não deverá deixar um arquivo parcialmente gravado.

### RNF-007 — Concorrência

O sistema deverá impedir que duas importações escrevam simultaneamente no mesmo arquivo.

Poderá ser utilizado:

- Lock por usuário.
- Lock por livro.
- Fila interna de escrita.
- Mecanismo equivalente.

### RNF-008 — Recuperação

Arquivos temporários abandonados após uma falha deverão ser detectados e tratados durante a inicialização.

### RNF-009 — Backup

A documentação deverá explicar como realizar backup e restauração de:

- Banco SQLite.
- Diretório de arquivos Markdown.
- Configurações da aplicação.

O backup do diretório Markdown será obrigatório, pois ele contém os clippings.

---

## 12. Desempenho

### RNF-010 — Listagem de livros

A listagem deverá utilizar preferencialmente o índice reconstruível, evitando interpretar todos os arquivos Markdown a cada requisição.

### RNF-011 — Leitura de um livro

Somente o arquivo do livro solicitado deverá ser lido para apresentar seus clippings.

### RNF-012 — Busca global

Uma busca que envolva todos os livros poderá utilizar um índice de pesquisa reconstruível.

O índice não será considerado armazenamento primário dos clippings.

### RNF-013 — Invalidação do cache

Caches deverão ser invalidados quando:

- Uma importação alterar um arquivo.
- Um arquivo for removido.
- O hash ou a data de modificação mudar.
- A versão do schema for atualizada.

---

## 13. Docker e persistência

O Docker Compose deverá configurar volumes persistentes separados para:

```text
/data/database
/data/users
```

O diretório `/data/database` armazenará o SQLite.

O diretório `/data/users` armazenará os arquivos Markdown dos usuários.

A recriação dos containers não poderá remover esses dados.

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

---

## 14. Critérios de aceite revisados

### CA-001 — Primeira importação

**Dado** que o usuário possui um arquivo válido com clippings de três livros
**Quando** realizar a importação
**Então** o sistema deverá criar um arquivo Markdown para cada livro
**E** os clippings deverão estar presentes nos respectivos arquivos
**E** nenhum clipping deverá ser armazenado no banco de dados.

### CA-002 — Reimportação

**Dado** que todos os clippings do arquivo já estão presentes nos arquivos Markdown
**Quando** o usuário importar novamente o mesmo arquivo
**Então** nenhum arquivo deverá receber clippings duplicados
**E** o resultado deverá informar zero novos clippings.

### CA-003 — Importação parcialmente nova

**Dado** que um arquivo contém clippings existentes e novos
**Quando** o usuário realizar a importação
**Então** somente os novos clippings deverão ser adicionados aos arquivos Markdown
**E** os registros existentes deverão ser contabilizados como duplicados.

### CA-004 — Leitura posterior

**Dado** que a aplicação foi reiniciada
**E** os arquivos Markdown permanecem no volume persistente
**Quando** o usuário acessar a lista de livros
**Então** os livros deverão continuar disponíveis
**E** seus clippings deverão ser lidos dos respectivos arquivos.

### CA-005 — Reconstrução do índice

**Dado** que o índice do banco foi removido
**E** os arquivos Markdown continuam disponíveis
**Quando** a aplicação reconstruir o índice
**Então** todos os livros deverão voltar a ser apresentados
**E** nenhum conteúdo de clipping deverá ser perdido.

### CA-006 — Download

**Dado** que o usuário está visualizando um livro
**Quando** solicitar o download
**Então** o sistema deverá entregar o arquivo Markdown utilizado para armazenar aquele livro.

### CA-007 — Ausência de geração manual

**Dado** que o usuário está visualizando um livro
**Então** não deverá existir uma ação para gerar ou regenerar manualmente o Markdown.

### CA-008 — Falha durante a escrita

**Dado** que ocorre uma falha durante a atualização de um arquivo
**Quando** a operação não puder ser concluída
**Então** o arquivo anterior deverá permanecer íntegro
**E** a importação deverá ser registrada como falha
**E** o sistema não deverá considerar os novos clippings como persistidos.

---

## 15. História principal revisada

Como usuário, quero importar meus clippings do Kindle para que o sistema os organize automaticamente em arquivos Markdown separados por livro, permitindo que eu consulte os clippings na interface web e baixe esses arquivos quando necessário.

Ao importar novamente um arquivo, o sistema deverá ler os arquivos Markdown existentes, identificar os clippings já registrados e adicionar somente os novos.

Os arquivos Markdown deverão ser criados e atualizados automaticamente durante a importação, sem necessidade de geração manual.

---

## 16. Definição de pronto revisada

A primeira versão será considerada pronta quando:

- O sistema importar um arquivo `My Clippings.txt`.
- Os clippings forem agrupados por livro.
- Cada livro for armazenado em um arquivo Markdown.
- O conteúdo dos clippings não for armazenado no SQLite.
- Os arquivos forem criados e atualizados automaticamente.
- A reimportação não gerar duplicidades.
- A aplicação conseguir listar livros lendo um índice derivado dos arquivos.
- A aplicação conseguir ler os clippings diretamente dos arquivos Markdown.
- O índice puder ser reconstruído.
- O usuário puder baixar o Markdown de um livro.
- Não existir geração manual de Markdown.
- As escritas forem atômicas.
- Os arquivos forem armazenados em volume persistente.
- Os fluxos de importação, deduplicação, leitura e download possuírem testes automatizados.

Uma consequência importante dessa decisão é que **editar ou excluir clippings pela interface exige reescrever o Markdown correspondente**. Caso essas funcionalidades não sejam necessárias no MVP, é melhor removê-las da primeira versão e tratar os arquivos como imutáveis, recebendo novos registros apenas pelas importações.
