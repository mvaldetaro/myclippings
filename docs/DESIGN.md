---
version: alpha
name: MyClippings
description: Uma plataforma de leitura acolhedora e editorial, com uma interface acessível, poucos elementos visuais periféricos e um tom claramente literário.
colors:
  primary: "#00635D"
  primary-60: "#4B8F89"
  primary-80: "#1F776F"
  secondary: "#F5D47A"
  tertiary: "#B38B22"
  neutral: "#D8D8D8"
  surface: "#FFFFFF"
  background: "#FFFFFF"
  on-surface: "#181818"
  text: "#000000"
  muted: "#6B6B6B"
  border: "#D8D8D8"
  error: "#B00020"
typography:
  headline-display:
    fontFamily: Lato
    fontSize: 32px
    fontWeight: 700
    lineHeight: 38px
    letterSpacing: 0px
  headline-lg:
    fontFamily: Lato
    fontSize: 26px
    fontWeight: 400
    lineHeight: 31px
    letterSpacing: 0px
  headline-md:
    fontFamily: Lato
    fontSize: 21px
    fontWeight: 400
    lineHeight: 25px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Lato
    fontSize: 17px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-lg:
    fontFamily: Lato
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: Lato
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: 0px
  body-sm:
    fontFamily: Lato
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  label-lg:
    fontFamily: Lato
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: Lato
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: Lato
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  link:
    fontFamily: Lato
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 3px
  md: 8px
  lg: 10px
  xl: 12px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 18px
  lg: 32px
  xl: 80px
  gutter: 24px
  section: 40px
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "#333333"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "49px"
  button-primary-hover:
    backgroundColor: "#EBC85D"
    textColor: "#333333"
    rounded: "{rounded.sm}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#333333"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "49px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  chip:
    backgroundColor: "#F3F0E1"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# MyClippings

## Visão geral

O MyClippings transmite a sensação de um local editorial de leitura: amigável, familiar e levemente nostálgica, em vez de moderna, fria ou orientada por tendências. A interface é espaçosa e prioriza o conteúdo, dando mais destaque ao conteúdo e informações do livro do que a elementos meramente decorativos. O tom é profissional, porém acolhedor, apoiando-se em tons neutros suaves, um destaque dourado e ilustrações de temática literária para tornar o produto acessível e convidativo.

## Cores

- **Primária (#00635D):** Um verde-petróleo profundo característico do MyClippings, usado em links acionáveis, textos de entrada e ênfases sutis. Deve transmitir confiança e legibilidade, sem parecer chamativo.
- **Secundária (#F5D47A):** Um dourado quente, com clima de clube do livro, usado em botões principais de chamada para ação e em superfícies destacadas da interface. Ele confere ao sistema sua energia acolhedora característica.
- **Terciária (#B38B22):** Um marrom-dourado mais intenso, usado como tom de contorno ou borda no tratamento dos botões amarelos, acrescentando definição sem contraste excessivo.
- **Superfície (#FFFFFF):** A cor principal das superfícies de cartões e páginas. A maioria dos contêineres utiliza branco puro para manter a experiência de leitura limpa e sem distrações.
- **Fundo (#FFFFFF):** A tela geral da página também é branca, reforçando a sensação de abertura e mantendo a atenção nos blocos de conteúdo e nas imagens.
- **Sobre a superfície (#181818):** Um tom quase preto para títulos e textos corridos dentro dos cartões. É mais suave do que o preto puro, mas ainda apresenta alta legibilidade.
- **Neutro / Borda (#D8D8D8):** Um cinza-claro usado em bordas de cartões, contornos de campos e separadores sutis. Ele fornece estrutura no lugar de sombras.
- **Texto (#000000):** O tom de tinta mais forte aparece em títulos de grande destaque e no tratamento do logotipo. Use com moderação para obter o máximo contraste.
- **Suave (#6B6B6B):** Textos de apoio e metadados secundários devem usar um cinza discreto para não competir com os títulos.
- **Erro (#B00020):** Reservado para validações e estados destrutivos. Embora não tenha destaque na visualização atual, deve permanecer como um vermelho semântico claro.

## Tipografia

O sistema é construído em torno da fonte Lato, uma sans-serif limpa, com uma sensação amigável e editorial. Os títulos usam, em sua maioria, peso regular, o que mantém a interface suave e acessível; somente os maiores elementos de destaque utilizam negrito para reforçar a hierarquia.

`headline-display` e `headline-lg` são mais adequados para títulos de destaque e mensagens principais de seção. `headline-md` e `headline-sm` dão suporte a cabeçalhos de seção e títulos de cartões sem criar peso visual excessivo. O texto corrido permanece compacto e legível em 14px/21px, combinando com uma disposição de informações densa, porém administrável.

Rótulos e links devem permanecer discretos, sem uso agressivo de letras maiúsculas nem espaçamento exagerado entre caracteres. O ritmo tipográfico geral é direto: alturas de linha bem definidas, capitalização comum de frases e mínima variação estilística, para que os livros e suas capas continuem sendo o foco principal.

## Layout e espaçamento

A página utiliza um layout fluido e orientado pelo conteúdo, com uma coluna centralizada e amplas margens brancas ao redor das áreas principais. A seção de destaque ocupa uma grande largura da janela de visualização, enquanto superfícies interativas importantes, como o cartão de cadastro e os painéis de recomendação, permanecem em blocos delimitados para garantir clareza.

O espaçamento segue uma progressão suave, em vez de uma grade modular rígida. Use `xs` para pequenos ajustes, `sm` e `md` para preenchimentos internos de componentes, `lg` para dar respiro entre seções e `xl` para grandes separações verticais entre regiões empilhadas. Cartões e painéis devem parecer arejados, com 24px de preenchimento interno e espaço em branco generoso ao redor de títulos, imagens e textos de apoio.

## Elevação e profundidade

A profundidade é trabalhada com pouquíssimas sombras. Em vez de camadas flutuantes, a interface utiliza contraste tonal, bordas finas e blocos de fundo distintos para separar as regiões. O painel de cadastro e os cartões de conteúdo parecem elevados porque estão posicionados sobre superfícies brancas com bordas cinza-claras, e não por causa de sombras pronunciadas.

Essa abordagem plana combina com a natureza editorial do produto. Quando for necessário criar hierarquia, use espaçamento, limites de cartões e preenchimentos com tons quentes de destaque, em vez de desfoques dramáticos ou elevação intensa.

## Formas

A linguagem de formas é suavemente arredondada, porém contida. Os botões utilizam um raio pequeno de 3px para manter uma aparência clássica e funcional, enquanto os cartões adotam um raio mais confortável de 10px para suavizar contêineres maiores. Os campos de entrada permanecem próximos ao raio dos botões, garantindo uma interface consistente e equilibrada.

Evite formatos de pílula, exceto em chips ou etiquetas intencionais. A sensação geral deve permanecer literária e tradicional, em vez de divertida ou excessivamente moderna.

## Componentes

Os botões representam o padrão de componente reutilizável mais forte do sistema.

- **Botões primários (`button-primary`):** Preenchidos com o dourado quente de `colors.secondary` e delimitados sutilmente pelo tom mais escuro de `colors.tertiary`, seguindo o estilo legado. São dimensionados para ações de destaque, como “Continuar com a Amazon” e “Descobrir mais”, com 49px de altura e preenchimento horizontal compacto.
- **Botões secundários (`button-secondary`):** Botões brancos com borda, destinados a métodos alternativos de cadastro, como a Apple. Devem permanecer calmos e neutros, usando a mesma altura e tipografia dos botões primários.
- **Botões terciários (`button-tertiary`):** Ações somente em texto, como links para entrar ou elementos de navegação leve. Use `colors.primary` e mantenha o preenchimento mínimo para que sejam percebidos como links, e não como botões.
- **Estados de hover e ativo:** Mantenha o retorno de interação sutil; um dourado ligeiramente mais intenso ao passar o ponteiro já é suficiente. Evite efeitos brilhantes, sombras fortes ou mudanças animadas de profundidade.
- **Cartões (`card`):** Superfícies brancas com `rounded.lg`, bordas neutras finas e 24px de preenchimento. Os cartões devem enquadrar seções de conteúdo, módulos de recomendação e painéis de autenticação sem ruído visual.
- **Campos (`input`):** Campos claros, com bordas, arredondamento discreto e preenchimento compacto. Devem parecer ferramentas simples de busca, e não objetos de design em destaque.
- **Chips:** Quando usados, devem ser discretos e informativos, com fundos neutros suaves e texto pequeno. Devem apoiar a navegação e a filtragem sem desviar a atenção.
- **Listas e módulos de conteúdo:** As recomendações de livros devem ser apresentadas em blocos estruturados, com espaçamento interno claro e alinhamento entre capas, títulos e metadados em uma hierarquia fácil de percorrer visualmente.
- **Tratamento do logotipo e cabeçalho:** A marca nominativa é discreta e possui uma aparência semelhante à de uma fonte serifada na referência original, mas o sistema deve preservar um contraste forte no nível mais alto e bastante espaço ao redor da marca.

## Recomendações e restrições

- Mantenha a interface editorial e centrada no conteúdo, com espaço em branco generoso ao redor dos módulos voltados à leitura.
- Use a cor primária verde-petróleo em links e ações leves, reservando o destaque dourado para chamadas para ação de alta prioridade.
- Prefira superfícies planas, bordas finas e espaçamento a sombras para estabelecer hierarquia.
- Mantenha a tipografia simples, legível e predominantemente em peso regular para preservar o tom acessível.
- Não introduza painéis escuros e pesados nem gradientes brilhantes que disputem atenção com as imagens das capas dos livros.
- Não arredonde excessivamente os controles; o sistema deve parecer clássico e contido, não baseado em pílulas nem excessivamente lúdico.
- Não use rótulos com excesso de letras maiúsculas nem espaçamento apertado entre caracteres, a menos que um componente específico realmente exija isso.
- Não torne o conteúdo secundário visualmente mais chamativo do que os cartões de recomendação, a mensagem de destaque ou o fluxo de cadastro.
