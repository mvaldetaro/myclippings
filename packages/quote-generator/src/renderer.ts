import type { Clipping, Book } from '@my-clippings/domain';
import type { QuotePreferences } from '@my-clippings/schemas';
import sharp from 'sharp';

// ─── Constantes de layout ─────────────────────────────────────────────────────

/** Tamanho do canvas (quadrado) */
const CANVAS_SIZE = 1080;

/** Margem em todos os lados */
const MARGIN = 80;

/** Largura máxima do conteúdo central */
const MAX_CONTENT_WIDTH = CANVAS_SIZE - MARGIN * 2;

/** Tamanho base da fonte para citações curtas */
const BASE_FONT_SIZE = 42;

/** Tamanho mínimo da fonte antes de truncar */
const MIN_FONT_SIZE = 18;

/** Tamanho da fonte da linha de atribuição */
const ATTRIBUTION_FONT_SIZE = 28;

/** Posição Y da linha de atribuição */
const ATTRIBUTION_Y = 900;

/** Proporção da altura de linha (1.5x o tamanho da fonte) */
const LINE_HEIGHT_RATIO = 1.5;

/** Largura aproximada de um caractere (proporção da largura do glifo) */
const CHAR_WIDTH_RATIO = 0.55;

/** Tamanhos de fonte decrescentes para tentar encaixar texto longo */
const FONT_SIZE_STEPS = [42, 36, 32, 28, 24, 20, 18] as const;

// ─── Quebra de texto ──────────────────────────────────────────────────────────

/**
 * Divide o texto em linhas que cabem dentro da largura máxima,
 * usando largura estimada de caractere proporcional ao tamanho da fonte.
 *
 * Preserva quebras de parágrafo (linhas em branco entre parágrafos).
 *
 * @param text - Texto da citação
 * @param fontSize - Tamanho da fonte em px
 * @param maxWidth - Largura máxima da linha em px
 * @returns Array de linhas
 */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    // Parágrafo vazio: linha em branco para separação visual
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      // Verifica se a palavra cabe na linha atual
      if (testLine.length * charWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        // Palavra não cabe: finaliza linha atual
        if (currentLine) {
          lines.push(currentLine);
        }

        // Palavra longa que não cabe sozinha: quebra forçada por caractere
        if (word.length * charWidth > maxWidth) {
          currentLine = '';
          for (const ch of word) {
            const testChar = currentLine ? `${currentLine}${ch}` : ch;
            if (testChar.length * charWidth <= maxWidth) {
              currentLine = testChar;
            } else {
              lines.push(currentLine);
              currentLine = ch;
            }
          }
        } else {
          currentLine = word;
        }
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
 * na altura disponível. Reduz progressivamente e, como último
 * recurso, trunca o texto no tamanho mínimo.
 *
 * @param text - Texto da citação
 * @param availableHeight - Altura vertical disponível em px
 * @returns Tamanho de fonte e linhas resultantes
 */
function calculateFontSize(text: string, availableHeight: number): FontCalculation {
  for (const fontSize of FONT_SIZE_STEPS) {
    const lines = wrapText(text, fontSize, MAX_CONTENT_WIDTH);
    const textHeight = fontSize * LINE_HEIGHT_RATIO * lines.length;

    // Texto cabe verticalmente com este tamanho de fonte
    if (textHeight <= availableHeight) {
      return { fontSize, lines };
    }

    // Se é o último tamanho (mínimo), força o encaixe com truncamento
    if (fontSize === MIN_FONT_SIZE) {
      return truncateText(text, MIN_FONT_SIZE, availableHeight);
    }
  }

  // Fallback de segurança (nunca deve chegar aqui)
  return truncateText(text, MIN_FONT_SIZE, availableHeight);
}

/**
 * Trunca o texto para caber na altura disponível no tamanho mínimo de fonte.
 *
 * @param text - Texto da citação
 * @param fontSize - Tamanho da fonte (deve ser MIN_FONT_SIZE)
 * @param availableHeight - Altura disponível em px
 * @returns Linhas truncadas com "…" na última linha
 */
function truncateText(
  text: string,
  fontSize: number,
  availableHeight: number,
): FontCalculation {
  const lines = wrapText(text, fontSize, MAX_CONTENT_WIDTH);
  // Quantas linhas cabem na altura disponível
  const maxLines = Math.floor(availableHeight / (fontSize * LINE_HEIGHT_RATIO));

  if (lines.length <= maxLines) {
    return { fontSize, lines };
  }

  // Mantém apenas as linhas que cabem
  const truncated = lines.slice(0, maxLines);
  const lastIdx = truncated.length - 1;
  const lastLine = truncated[lastIdx];

  if (lastLine !== undefined) {
    // Espaço reservado para "…" (~2 caracteres visuais)
    const maxChars = Math.floor(MAX_CONTENT_WIDTH / (fontSize * CHAR_WIDTH_RATIO));
    const ellipsis = '\u2026'; // caractere "…"
    truncated[lastIdx] = lastLine.slice(0, maxChars - 2) + ellipsis;
  }

  return { fontSize, lines: truncated };
}

// ─── Construção da atribuição ─────────────────────────────────────────────────

/**
 * Constrói a linha de atribuição no formato "— Título, Autor".
 * Respeita as preferências de exibição.
 *
 * @param book - Dados do livro
 * @param preferences - Preferências de exibição
 * @returns String de atribuição ou string vazia
 */
function buildAttribution(book: Book, preferences: QuotePreferences): string {
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
  const attrWidth = attribution.length * ATTRIBUTION_FONT_SIZE * CHAR_WIDTH_RATIO;
  if (attrWidth > MAX_CONTENT_WIDTH) {
    // Corta caracteres do final até caber, substituindo por "…"
    const maxChars = Math.floor(MAX_CONTENT_WIDTH / (ATTRIBUTION_FONT_SIZE * CHAR_WIDTH_RATIO));
    const ellipsis = '\u2026';
    attribution = attribution.slice(0, maxChars - 2) + ellipsis;
  }

  return attribution;
}

// ─── Construção do SVG ────────────────────────────────────────────────────────

/**
 * Escapa caracteres especiais XML em uma string.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Constrói a string SVG completa com fundo, texto da citação e atribuição.
 *
 * @param lines - Linhas do texto já quebradas
 * @param fontSize - Tamanho da fonte para o texto da citação
 * @param textColor - Cor do texto (hex)
 * @param backgroundColor - Cor do fundo (hex)
 * @param attribution - Linha de atribuição (string vazia se não houver)
 * @returns String SVG
 */
function buildSvg(
  lines: string[],
  fontSize: number,
  textColor: string,
  backgroundColor: string,
  attribution: string,
): string {
  const hasAttribution = attribution.length > 0;

  // Altura disponível para o texto principal
  const availableHeight = hasAttribution
    ? ATTRIBUTION_Y - MARGIN - ATTRIBUTION_FONT_SIZE * LINE_HEIGHT_RATIO
    : CANVAS_SIZE - MARGIN * 2;

  // Altura total do bloco de texto
  const textBlockHeight = fontSize * LINE_HEIGHT_RATIO * lines.length;

  // Posição Y da linha de base da primeira linha, centralizada verticalmente
  // O "+ fontSize * 0.8" compensa a diferença entre baseline e topo visual do glifo
  const startY = MARGIN + (availableHeight - textBlockHeight) / 2 + fontSize * 0.8;

  // Constrói elementos <tspan> para cada linha
  const centerX = CANVAS_SIZE / 2;
  const tspanElements = lines
    .map((line, i) => {
      const escaped = escapeXml(line);
      // Primeira linha: dy="0" (usa o y do <text> pai)
      if (i === 0) {
        return `<tspan x="${centerX}" dy="0">${escaped}</tspan>`;
      }
      // Linhas seguintes: dy="1.5em" para espaçamento proporcional à fonte
      return `<tspan x="${centerX}" dy="1.5em">${escaped}</tspan>`;
    })
    .join('\n');

  // Linha de atribuição no rodapé
  const attributionXml = hasAttribution
    ? `<text font-family="Lato, sans-serif" font-size="${ATTRIBUTION_FONT_SIZE}" fill="${textColor}" text-anchor="middle" x="${centerX}" y="${ATTRIBUTION_Y}">${escapeXml(attribution)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
  <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="${backgroundColor}"/>
  <text font-family="Lato, sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" y="${startY}">
${tspanElements}
  </text>
${attributionXml}
</svg>`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Gera uma imagem PNG 1080×1080 com uma citação do Kindle.
 *
 * Usa sharp para renderizar um SVG com fundo colorido, texto centralizado
 * e atribuição (título/autor) no rodapé. Aplica quebra de linha automática
 * e redução progressiva de fonte para citações longas.
 *
 * @param clipping - O clipping do Kindle com o conteúdo da citação
 * @param book - Metadados do livro (título, autor)
 * @param preferences - Preferências de estilo (cores, visibilidade de metadados)
 * @returns Buffer PNG da imagem gerada
 */
export async function generateQuoteImage(
  clipping: Clipping,
  book: Book,
  preferences: QuotePreferences,
): Promise<Buffer> {
  const attribution = buildAttribution(book, preferences);
  const hasAttribution = attribution.length > 0;

  // Altura disponível para o texto principal (desconta a área da atribuição)
  const availableHeight = hasAttribution
    ? ATTRIBUTION_Y - MARGIN - ATTRIBUTION_FONT_SIZE * LINE_HEIGHT_RATIO
    : CANVAS_SIZE - MARGIN * 2;

  // Calcula tamanho de fonte ideal e quebra o texto em linhas
  const { fontSize, lines } = calculateFontSize(clipping.content, availableHeight);

  // Constrói o SVG
  const svg = buildSvg(
    lines,
    fontSize,
    preferences.textColor,
    preferences.backgroundColor,
    attribution,
  );

  // Renderiza o SVG como PNG via sharp
  return sharp(Buffer.from(svg, 'utf-8')).png().toBuffer();
}
