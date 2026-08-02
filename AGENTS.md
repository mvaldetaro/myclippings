# AGENTS.md - Investira.biz

## Diretrizes de comportamento

Diretrizes de comportamento para reduzir erros comuns de LLMs ao programar. Mescle com as instruções específicas do projeto conforme necessário.

**Tradeoff:** Estas diretrizes privilegiam cautela em detrimento de velocidade. Para tarefas triviais, use o bom senso.

## 1. Pense Antes de Codar

**Não assuma. Não esconda confusão. Exponha os tradeoffs.**

Antes de implementar:

- Declare suas premissas explicitamente. Se estiver incerto, pergunte.
- Se houver múltiplas interpretações possíveis, apresente-as — não escolha silenciosamente.
- Se existir uma abordagem mais simples, diga. Questione quando for pertinente.
- Se algo não estiver claro, pare. Nomeie o que está confuso. Pergunte.

## 2. Simplicidade em Primeiro Lugar

**O mínimo de código que resolve o problema. Nada especulativo.**

- Nenhuma funcionalidade além do que foi pedido.
- Nenhuma abstração para código de uso único.
- Nenhuma "flexibilidade" ou "configurabilidade" que não foi solicitada.
- Nenhum tratamento de erro para cenários impossíveis.
- Se você escrever 200 linhas e for possível fazer em 50, reescreva.

Pergunte-se: "Um engenheiro sênior diria que isso está complicado demais?" Se sim, simplifique.

## 3. Mudanças Cirúrgicas

**Toque apenas no que é necessário. Limpe apenas a sua própria bagunça.**

Ao editar código existente:

- Não "melhore" código, comentários ou formatação adjacentes.
- Não refatore o que não está quebrado.
- Mantenha o estilo existente, mesmo que você faria diferente.
- Se notar código morto não relacionado, mencione — não delete.

Quando suas mudanças gerarem órfãos:

- Remova imports/variáveis/funções que AS SUAS mudanças tornaram desnecessários.
- Não remova código morto pré-existente a menos que seja solicitado.
- Se notar código morto, mencione ao usuário.

O teste: cada linha alterada deve ser rastreável diretamente à solicitação do usuário.

## 4. Execução Orientada a Objetivos

**Defina critérios de sucesso. Itere até verificar.**

Transforme tarefas em objetivos verificáveis:

- "Adicione validação" → "Escreva testes para entradas inválidas, depois faça-os passar"
- "Corrija o bug" → "Escreva um teste que o reproduza, depois faça-o passar"
- "Refatore X" → "Garanta que os testes passem antes e depois"

Para tarefas de múltiplas etapas, declare um plano resumido:

```
1. [Etapa] → verificar: [checagem]
2. [Etapa] → verificar: [checagem]
3. [Etapa] → verificar: [checagem]
```

Critérios de sucesso sólidos permitem iterar de forma independente. Critérios fracos ("faça funcionar") exigem esclarecimentos constantes.

---

**Estas diretrizes estão funcionando se:** houver menos mudanças desnecessárias nos diffs, menos reescritas por excesso de complexidade, e as perguntas de esclarecimento vierem antes da implementação — não depois dos erros.

## Documentação no Código

- Incluir documentação da própria função.
- Priorizar comentários claros e úteis.
- Documentar também trechos linha a linha, pricipalmente 'if's.
- Documentação no idioma portugues-BR.

## Formatação

- Não usar outro formatador de código; o padrão oficial é biomejs.

## Antes de criar novas funções

- Analiser se há similares nas libs e packages do projeto.
- Verificar se já existe uma função com a mesma finalidade.
- Se existir, modificar o arquivo existente.
- Se não existir, criar novo arquivo.

## Qualidade do código

- Não crie código duplicado ou funções iguais em arquivos diferentes. Procure organizar o código sem duplicar função.

## Especificações do projeto

- As especificações estão documentadas em [SPEC.md](/docs/SPEC.md), consulte sempre que achar necessário.

## Arquitetura e caminhos chave

Consulte o arquivo [ARCHITECTURE.md](/docs/ARCHITECTURE.md) para entender a arquitetura do projeto e os caminhos chave.

## Design System

Consulte o arquivo [DESIGN.md](/docs/DESIGN.md) para entender o design system do projeto.

## Documentações e memórias de implementação

Consulte e atualize os arquivos de documentação de acordo com as seguintes diretrizes:

### Diretrizes de Atualização de Documentos

1. **[PLANNING.md](/docs/PLANNING.md) (Planejamento do projeto)**
   - **Quando atualizar:** Antes de iniciar qualquer tarefa complexa, mudança arquitetural relevante, ou desenvolvimento de uma nova funcionalidade que precise de alinhamento técnico.
   - **Como atualizar:** Detalhar os objetivos da tarefa, a estratégia técnica, as etapas de execução propostas, as dependências, os possíveis impactos colaterais e os critérios de aceitação/validação.

2. **[HISTORY.md](/docs/HISTORY.md) (Histórico de implementação)**
   - **Quando atualizar:** Imediatamente após a conclusão de uma tarefa, correção de bug ou implementação de funcionalidade (fim de ciclo ou de turno).
   - **Como atualizar:** Adicionar uma entrada cronológica descrevendo brevemente o que foi feito, quais arquivos principais foram alterados/criados, o status atual do progresso e as validações efetuadas.

3. **[DISCUSSIONS.md](/docs/DISCUSSIONS.md) (Discussões sobre o projeto)**
   - **Quando atualizar:** Sempre que houver dúvidas sobre requisitos, dilemas de design, tradeoffs significativos ou propostas técnicas que exijam debate e validação com o usuário antes de decidir o caminho.
   - **Como atualizar:** Registrar o tópico, o contexto técnico, as opções consideradas com seus prós/contras e as perguntas em aberto.

4. **[DECISIONS.md](/docs/DECISIONS.md) (Decisões e memórias de implementação)**
   - **Quando atualizar:** Assim que uma decisão arquitetural ou técnica for formalizada (seja após uma discussão concluída ou ao definir padrões de código importantes).
   - **Como atualizar:** Documentar o contexto que motivou a decisão, a solução técnica escolhida, a justificativa da escolha e o impacto na base de código atual ou futura.

---

### Links de Referência

Consulte sempre que achar necessário:

- [SPEC.md](/docs/SPEC.md) - Especificações do projeto
- [ARCHITECTURE.md](/docs/ARCHITECTURE.md) - Arquitetura do projeto
- [DESIGN.md](/docs/DESIGN.md) - Design system do projeto
- [PLANNING.md](/docs/PLANNING.md) - Planejamento do projeto
- [HISTORY.md](/docs/HISTORY.md) - Histórico de implementação
- [DISCUSSIONS.md](/docs/DISCUSSIONS.md) - Discussões sobre o projeto
- [DECISIONS.md](/docs/DECISIONS.md) - Decisões e memórias de implementação
- [my-clippings-example.txt](/my-clippings-example.txt) - Exemplo de arquivo my clippings

---
