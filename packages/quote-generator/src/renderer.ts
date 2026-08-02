import { createCanvas, registerFont, type CanvasRenderingContext2D } from 'canvas';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Clipping, Book } from '@my-clippings/domain';
import type { QuotePreferences } from '@my-clippings/schemas';

// ─── Fontes customizadas ──────────────────────────────────────────────────────
// Registradas no nível do módulo para estarem disponíveis antes da criação
// de qualquer canvas. Usa caminho relativo ao diretório deste arquivo.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');

registerFont(join(FONTS_DIR, 'Lora-Regular.ttf'), {
  family: 'Lora',
  weight: '400',
});
registerFont(join(FONTS_DIR, 'Poppins-Regular.ttf'), {
  family: 'Poppins',
  weight: '400',
});
registerFont(join(FONTS_DIR, 'Poppins-SemiBold.ttf'), {
  family: 'Poppins',
  weight: '600',
});

// ─── Constantes de layout ─────────────────────────────────────────────────────

/** Tamanho do canvas (quadrado 1:1) */
const CANVAS_SIZE = 1080;

/** Margem proporcional ao tamanho do canvas */
const MARGIN_RATIO = 0.11;

/** Posição vertical das aspas decorativas (proporcional) */
const QUOTE_MARK_Y_RATIO = 0.12;

/** Tamanho das aspas decorativas (proporcional) */
const QUOTE_MARK_SIZE_RATIO = 0.16;

/** Topo da área de texto principal (proporcional) */
const TEXT_AREA_TOP_RATIO = 0.35;

/** Base da área de texto principal quando há atribuição (proporcional) */
const TEXT_AREA_BOTTOM_RATIO = 0.82;

/** Base da área de texto quando não há atribuição (proporcional) */
const TEXT_AREA_BOTTOM_NO_ATTRIB_RATIO = 0.92;

/** Posição Y da linha de atribuição (proporcional) */
const ATTRIBUTION_Y_RATIO = 0.9;

/** Tamanho da fonte de atribuição (proporcional) */
const ATTRIBUTION_FONT_SIZE_RATIO = 0.025;

/** Tamanho inicial da fonte do texto (proporcional) */
const START_FONT_SIZE_RATIO = 0.078;

/** Tamanho mínimo da fonte em px antes de truncar */
const MIN_FONT_SIZE = 18;

/** Decremento do tamanho da fonte a cada iteração (px) */
const FONT_SIZE_STEP = 2;

/** Proporção da altura de linha */
const LINE_HEIGHT_RATIO = 1.4;

/** Margem interna para o texto (evita colar nas bordas) */
const MARGIN_PX = Math.round(CANVAS_SIZE * MARGIN_RATIO);

// ─── Quebra de texto ──────────────────────────────────────────────────────────

/**
 * Divide o texto em linhas que cabem dentro da largura máxima,
 * usando medição real de glifos via measureText().
 *
 * Preserva quebras de parágrafo (linhas em branco entre parágrafos).
 *
 * @param ctx    - Contexto 2D do canvas com a fonte já configurada
 * @param text   - Texto da citação
 * @param maxWidth - Largura máxima da linha em px
 * @returns Array de linhas
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    // Parágrafo vazio: linha em branco para separação visual
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
        currentLine = candidate;
      } else {
        // Palavra não cabe na linha atual: finaliza e começa nova
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// ─── Cálculo de tamanho de fonte ──────────────────────────────────────────────

/**
 * Resultado do cálculo de fonte e quebra de linha.
 */
interface FontCalculation {
  fontSize: number;
  lines: string[];
}

/**
 * Determina o melhor tamanho de fonte para que o texto caiba
 * na altura disponível. Reduz progressivamente de 2px em 2px
 * até o texto caber ou atingir o tamanho mínimo.
 *
 * @param ctx          - Contexto 2D do canvas
 * @param text         - Texto da citação
 * @param maxWidth     - Largura máxima da área de texto em px
 * @param maxHeight    - Altura máxima da área de texto em px
 * @param startSize    - Tamanho inicial da fonte em px
 * @returns Tamanho de fonte e linhas resultantes
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
): FontCalculation {
  let fontSize = startSize;

  while (fontSize >= MIN_FONT_SIZE) {
    ctx.font = `400 ${fontSize}px "Lora"`;
    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const blockHeight = lines.length * lineHeight;

    if (blockHeight <= maxHeight) {
      return { fontSize, lines };
    }
    fontSize -= FONT_SIZE_STEP;
  }

  // Tamanho mínimo atingido: força o encaixe com truncamento
  return truncateText(ctx, text, maxWidth, maxHeight);
}

/**
 * Trunca o texto para caber na altura disponível no tamanho mínimo de fonte.
 *
 * @param ctx        - Contexto 2D do canvas
 * @param text       - Texto da citação
 * @param maxWidth   - Largura máxima em px
 * @param maxHeight  - Altura máxima em px
 * @returns Linhas truncadas com "…" ao final
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
): FontCalculation {
  ctx.font = `400 ${MIN_FONT_SIZE}px "Lora"`;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = MIN_FONT_SIZE * LINE_HEIGHT_RATIO;
  const maxLines = Math.floor(maxHeight / lineHeight);

  if (lines.length <= maxLines) {
    return { fontSize: MIN_FONT_SIZE, lines };
  }

  // Mantém apenas as linhas que cabem
  const truncated = lines.slice(0, maxLines);
  const lastIdx = truncated.length - 1;
  const lastLine = truncated[lastIdx];

  if (lastLine !== undefined) {
    // Adiciona "…" ao final, garantindo que caiba na largura
    const ellipsis = '\u2026';
    while (ctx.measureText(lastLine + ellipsis).width > maxWidth && lastLine.length > 0) {
      truncated[lastIdx] = lastLine.slice(0, -1);
    }
    truncated[lastIdx] = `${truncated[lastIdx]}${ellipsis}`;
  }

  return { fontSize: MIN_FONT_SIZE, lines: truncated };
}

// ─── Construção da atribuição ─────────────────────────────────────────────────

/**
 * Constrói a linha de atribuição no formato "— Título, Autor".
 * Respeita as preferências de exibição.
 *
 * @param book        - Dados do livro
 * @param preferences - Preferências de exibição
 * @param ctx         - Contexto 2D com fonte de atribuição configurada
 * @param maxWidth    - Largura máxima disponível
 * @returns String de atribuição (truncada se necessário) ou string vazia
 */
function buildAttribution(
  book: Book,
  preferences: QuotePreferences,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
): string {
  const parts: string[] = [];

  if (preferences.showBookTitle) {
    parts.push(book.title);
  }
  if (preferences.showAuthor) {
    parts.push(book.author);
  }

  if (parts.length === 0) {
    return '';
  }

  let attribution = `\u2014 ${parts.join(', ')}`;

  // Trunca se a atribuição for muito longa para caber na largura
  if (ctx.measureText(attribution).width > maxWidth) {
    const ellipsis = '\u2026';
    while (ctx.measureText(attribution + ellipsis).width > maxWidth && attribution.length > 0) {
      attribution = attribution.slice(0, -1);
    }
    attribution = `${attribution}${ellipsis}`;
  }

  return attribution;
}

// ─── Desenho das aspas decorativas ────────────────────────────────────────────

/**
 * Desenha as aspas decorativas ("“") no canto superior esquerdo.
 *
 * @param ctx   - Contexto 2D do canvas
 * @param x     - Posição X
 * @param y     - Posição Y
 * @param size  - Tamanho da fonte em px
 * @param color - Cor das aspas
 */
function drawQuoteMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.font = `400 ${size}px "Lora"`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  // "\u201C" = caractere "“" (aspas duplas de abertura)
  // Ajuste vertical: sobe um pouco para alinhamento visual com o texto
  ctx.fillText('\u201C', x, y - size * 0.28);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Gera uma imagem PNG 1080×1080 com uma citação do Kindle.
 *
 * Usa node-canvas com fontes customizadas (Lora para o texto,
 * Poppins para a atribuição), medição precisa de glifos e layout
 * proporcional. Inclui aspas decorativas no canto superior esquerdo
 * e atribuição (título/autor) no rodapé.
 *
 * Diferente da implementação anterior (SVG + sharp), esta versão:
 * - Mede texto com precisão de pixel via ctx.measureText()
 * - Usa fontes customizadas registradas no sistema
 * - Ajusta tamanho de fonte em passos de 2px (não saltos grossos)
 * - Inclui elementos decorativos (aspas) para apelo visual
 * - Usa layout proporcional ao canvas (não pixels absolutos)
 *
 * @param clipping    - O clipping do Kindle com o conteúdo da citação
 * @param book        - Metadados do livro (título, autor)
 * @param preferences - Preferências de estilo (cores, visibilidade de metadados)
 * @returns Buffer PNG da imagem gerada
 */
export async function generateQuoteImage(
  clipping: Clipping,
  book: Book,
  preferences: QuotePreferences,
): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');

  // ── Fundo ──
  ctx.fillStyle = preferences.backgroundColor;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // ── Aspas decorativas ──
  const quoteMarkSize = Math.round(CANVAS_SIZE * QUOTE_MARK_SIZE_RATIO);
  drawQuoteMark(
    ctx,
    MARGIN_PX,
    CANVAS_SIZE * QUOTE_MARK_Y_RATIO,
    quoteMarkSize,
    preferences.textColor,
  );

  // ── Atribuição (calculada antes do texto para definir área disponível) ──
  const attributionFontSize = Math.round(CANVAS_SIZE * ATTRIBUTION_FONT_SIZE_RATIO);
  ctx.font = `600 ${attributionFontSize}px "Poppins"`;
  const contentWidth = CANVAS_SIZE - MARGIN_PX * 2;
  const attribution = buildAttribution(book, preferences, ctx, contentWidth);
  const hasAttribution = attribution.length > 0;

  // ── Área de texto principal ──
  const textAreaTop = CANVAS_SIZE * TEXT_AREA_TOP_RATIO;
  const textAreaBottom = hasAttribution
    ? CANVAS_SIZE * TEXT_AREA_BOTTOM_RATIO
    : CANVAS_SIZE * TEXT_AREA_BOTTOM_NO_ATTRIB_RATIO;
  const textAreaHeight = textAreaBottom - textAreaTop;

  // ── Cálculo de fonte e quebra de linha ──
  const startFontSize = Math.round(CANVAS_SIZE * START_FONT_SIZE_RATIO);
  const { fontSize, lines } = fitFontSize(
    ctx,
    clipping.content,
    contentWidth,
    textAreaHeight,
    startFontSize,
  );

  // ── Renderização do texto principal ──
  ctx.fillStyle = preferences.textColor;
  ctx.font = `400 ${fontSize}px "Lora"`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';

  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const blockHeight = lines.length * lineHeight;
  // Centraliza verticalmente o bloco de texto na área disponível
  // + fontSize * 0.85 compensa a diferença entre baseline e centro visual
  const startY = textAreaTop + (textAreaHeight - blockHeight) / 2 + fontSize * 0.85;
  const centerX = CANVAS_SIZE / 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line === '') {
      continue;
    }
    ctx.fillText(line, centerX, startY + i * lineHeight);
  }

  // ── Atribuição no rodapé ──
  if (hasAttribution) {
    ctx.font = `600 ${attributionFontSize}px "Poppins"`;
    ctx.fillStyle = preferences.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Letter-spacing manual: insere espaços finos entre caracteres
    // (canvas não suporta letter-spacing nativo)
    const spaced = attribution.split('').join('\u2009'); // thin space entre cada caractere
    ctx.fillText(spaced, centerX, CANVAS_SIZE * ATTRIBUTION_Y_RATIO);
  }

  // ── Exporta como PNG ──
  return canvas.toBuffer('image/png');
}
