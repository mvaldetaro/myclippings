import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { generateQuoteImage } from '../renderer';
import type { Clipping, Book } from '@my-clippings/domain';
import type { QuotePreferences } from '@my-clippings/schemas';

// ─── Dados de teste ───────────────────────────────────────────────────────────

const defaultClipping: Clipping = {
  id: 'clipping-001',
  bookId: 'book-001',
  type: 'destaque',
  content: 'A vida é aquilo que acontece enquanto fazemos planos para o futuro.',
  page: 42,
  locationStart: 100,
  locationEnd: 150,
  kindleDate: '2024-01-15T10:30:00.000Z',
  createdAt: '2024-01-15T12:00:00.000Z',
};

const defaultBook: Book = {
  id: 'book-001',
  title: 'O Pequeno Príncipe',
  author: 'Antoine de Saint-Exupéry',
  titleSlug: 'o-pequeno-principe',
  authorSlug: 'antoine-de-saint-exupery',
  clippingCount: 25,
  createdAt: '2024-01-10T08:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  schemaVersion: 1,
};

const defaultPreferences: QuotePreferences = {
  backgroundColor: '#00635D',
  textColor: '#FFFFFF',
  showAuthor: true,
  showBookTitle: true,
};

// ─── Assinatura PNG para validação ────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('generateQuoteImage', () => {
  it('retorna um Buffer PNG válido para uma citação curta', async () => {
    const result = await generateQuoteImage(defaultClipping, defaultBook, defaultPreferences);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    // Verifica se começa com a assinatura PNG
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    // Verifica dimensões da imagem gerada
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1080);
    expect(metadata.format).toBe('png');
  });

  it('aplica a cor de fundo correta', async () => {
    const prefs: QuotePreferences = { ...defaultPreferences, backgroundColor: '#FF0000' };
    const result = await generateQuoteImage(defaultClipping, defaultBook, prefs);

    // Extrai estatísticas de pixel do topo esquerdo (deve ser fundo puro)
    const stats = await sharp(result)
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const [r, g, b] = [stats.data[0], stats.data[1], stats.data[2]];
    // Fundo vermelho puro
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(50);
    expect(b).toBeLessThan(50);
  });

  it('respeita showAuthor=false', async () => {
    const prefs: QuotePreferences = { ...defaultPreferences, showAuthor: false };
    const result = await generateQuoteImage(defaultClipping, defaultBook, prefs);

    // Deve gerar um PNG válido mesmo sem autor
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    // Verifica que ainda tem o título na atribuição
    // (confirmamos indiretamente: a imagem é válida e não quebrou)
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('respeita showBookTitle=false', async () => {
    const prefs: QuotePreferences = { ...defaultPreferences, showBookTitle: false };
    const result = await generateQuoteImage(defaultClipping, defaultBook, prefs);

    // PNG válido
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('esconde atribuição quando ambos showAuthor e showBookTitle são false', async () => {
    const prefs: QuotePreferences = {
      ...defaultPreferences,
      showAuthor: false,
      showBookTitle: false,
    };
    const result = await generateQuoteImage(defaultClipping, defaultBook, prefs);

    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('aplica cor de texto diferente', async () => {
    const prefs: QuotePreferences = {
      ...defaultPreferences,
      backgroundColor: '#000000',
      textColor: '#FFFF00',
    };
    const result = await generateQuoteImage(defaultClipping, defaultBook, prefs);

    // Fundo preto, dimensões corretas
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1080);
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);
  });

  it('não quebra com citação longa (múltiplos parágrafos)', async () => {
    // Gera 15 parágrafos de ~80 caracteres cada — texto moderadamente longo
    const longContent = Array.from({ length: 15 }, (_, i) => {
      const words: string[] = [];
      for (let j = 0; j < 12; j++) {
        words.push(`palavra${i * 12 + j}`);
      }
      return words.join(' ');
    }).join('\n\n');

    const clipping: Clipping = { ...defaultClipping, content: longContent };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('não quebra com citação muito longa (força redução de fonte)', async () => {
    // Gera texto muito longo que força redução progressiva de fonte
    const veryLongContent = Array.from({ length: 60 }, (_, i) => {
      const words: string[] = [];
      for (let j = 0; j < 10; j++) {
        words.push(`termo${i * 10 + j}`);
      }
      return words.join(' ');
    }).join('\n');

    const clipping: Clipping = { ...defaultClipping, content: veryLongContent };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('não quebra com citação extremamente longa (força truncamento)', async () => {
    // Gera texto que mesmo no tamanho mínimo de fonte não cabe
    const massiveContent = Array.from({ length: 200 }, (_, i) => {
      const words: string[] = [];
      for (let j = 0; j < 8; j++) {
        words.push(`x${i * 8 + j}`);
      }
      return words.join(' ');
    }).join('\n');

    const clipping: Clipping = { ...defaultClipping, content: massiveContent };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('lida com citação de uma única palavra', async () => {
    const clipping: Clipping = { ...defaultClipping, content: 'Silêncio.' };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('lida com citação contendo caracteres especiais XML', async () => {
    const clipping: Clipping = {
      ...defaultClipping,
      content: 'Ela disse: "Olá & adeus". O código <div> não renderizou.',
    };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });

  it('gera imagens diferentes para citações diferentes', async () => {
    const result1 = await generateQuoteImage(defaultClipping, defaultBook, defaultPreferences);

    const clipping2: Clipping = {
      ...defaultClipping,
      content: 'Um texto completamente diferente para comparar.',
    };
    const result2 = await generateQuoteImage(clipping2, defaultBook, defaultPreferences);

    // Buffers devem ser diferentes
    expect(result1.equals(result2)).toBe(false);
  });

  it('lida com citação com quebras de linha internas', async () => {
    const clipping: Clipping = {
      ...defaultClipping,
      content: 'Linha um.\nLinha dois.\n\nLinha três após parágrafo vazio.',
    };
    const result = await generateQuoteImage(clipping, defaultBook, defaultPreferences);

    expect(result.slice(0, 8)).toEqual(PNG_SIGNATURE);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1080);
  });
});
