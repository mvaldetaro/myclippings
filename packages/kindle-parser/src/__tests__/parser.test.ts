import { describe, it, expect } from 'vitest';
import { parseClippingsFile, toRawClipping } from '../index';
import { readFixture } from './helpers';

describe('parseClippingsFile', () => {
  // ── Parsing básico ──────────────────────────────────────────────────────

  it('deve parsear um arquivo LF com múltiplos livros e tipos de clipping', () => {
    const buffer = readFixture('sample-lf.txt');
    const result = parseClippingsFile(buffer);

    expect(result.hasBOM).toBe(false);
    expect(result.records).toHaveLength(5);
    expect(result.invalidCount).toBe(0);

    // Primeiro registro: destaque do livro "A boa sorte"
    const first = result.records[0];
    expect(first).toBeDefined();
    expect(first!.title).toBe('A boa sorte');
    expect(first!.author).toBe('Álex Rovira Celma;Fernando Trías de Bes');
    expect(first!.type).toBe('destaque');
    expect(first!.content).toContain('Ali, sentindo-se em paz');
    expect(first!.locationStart).toBe(8);
    expect(first!.locationEnd).toBe(9);

    // Terceiro registro: "O Poder do Hábito"
    const third = result.records[2];
    expect(third).toBeDefined();
    expect(third!.title).toBe('O Poder do Hábito');
    expect(third!.author).toBe('Charles Duhigg');

    // Quarto registro: nota
    const fourth = result.records[3];
    expect(fourth).toBeDefined();
    expect(fourth!.type).toBe('nota');
    expect(fourth!.content).toBe('Preciso aplicar isso no projeto.');

    // Quinto registro: marcador (sem conteúdo)
    const fifth = result.records[4];
    expect(fifth).toBeDefined();
    expect(fifth!.type).toBe('marcador');
    expect(fifth!.content).toBe('');
  });

  // ── Suporte a CRLF ──────────────────────────────────────────────────────

  it('deve parsear arquivo com quebras de linha CRLF', () => {
    // Cria um buffer com CRLF
    const content =
      'A boa sorte (Álex Rovira Celma)\r\n- Seu destaque na posição 8-9 | Adicionado: domingo, 24 de novembro de 2024 15:44:40\r\n\r\nConteúdo do destaque.\r\n==========';
    const buffer = Buffer.from(content, 'utf-8');

    const result = parseClippingsFile(buffer);

    expect(result.records).toHaveLength(1);
    const record = result.records[0];
    expect(record).toBeDefined();
    expect(record!.title).toBe('A boa sorte');
    expect(record!.content).toBe('Conteúdo do destaque.');
  });

  // ── Suporte a BOM ───────────────────────────────────────────────────────

  it('deve detectar e parsear arquivo com BOM UTF-8', () => {
    const buffer = readFixture('sample-bom.txt');
    const result = parseClippingsFile(buffer);

    expect(result.hasBOM).toBe(true);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]!.title).toBe('A boa sorte');
  });

  it('deve parsear mesmo conteúdo com e sem BOM de forma equivalente', () => {
    // Cria versões com e sem BOM
    const content =
      'Livro (Autor)\n- Seu destaque na posição 10-15 | Adicionado: domingo, 1 de janeiro de 2025 10:00:00\n\nTexto.';
    const withBOM = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content, 'utf-8')]);
    const withoutBOM = Buffer.from(content, 'utf-8');

    const resultBOM = parseClippingsFile(withBOM);
    const resultNoBOM = parseClippingsFile(withoutBOM);

    expect(resultBOM.records[0]!.content).toBe(resultNoBOM.records[0]!.content);
    expect(resultBOM.records[0]!.title).toBe(resultNoBOM.records[0]!.title);
  });

  // ── Tipos de clipping ───────────────────────────────────────────────────

  it('deve identificar destaques corretamente', () => {
    const content =
      'Livro (Autor)\n- Seu destaque na posição 10-15 | Adicionado: domingo, 1 de janeiro de 2025 10:00:00\n\nTexto destacado.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.type).toBe('destaque');
  });

  it('deve identificar notas corretamente', () => {
    const content =
      'Livro (Autor)\n- Sua nota na posição 20-20 | Adicionado: segunda, 2 de janeiro de 2025 14:30:00\n\nMinha anotação.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.type).toBe('nota');
  });

  it('deve identificar marcadores corretamente', () => {
    const content =
      'Livro (Autor)\n- Seu marcador na posição 30-30 | Adicionado: terça, 3 de janeiro de 2025 09:00:00\n\n';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.type).toBe('marcador');
    expect(result.records[0]!.content).toBe('');
  });

  // ── Formato inglês ──────────────────────────────────────────────────────

  it('deve parsear registros no formato inglês', () => {
    const content =
      'Book Title (Author Name)\n- Your Highlight at location 42-44 | Added on Monday, 25 November 2024 10:15:22\n\nThis is the content.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records).toHaveLength(1);
    const record = result.records[0];
    expect(record).toBeDefined();
    expect(record!.title).toBe('Book Title');
    expect(record!.author).toBe('Author Name');
    expect(record!.type).toBe('destaque');
    expect(record!.locationStart).toBe(42);
    expect(record!.locationEnd).toBe(44);
  });

  it('deve parsear nota no formato inglês', () => {
    const content =
      'Book (Author)\n- Your Note at location 50-50 | Added on Tuesday, 26 November 2024 08:00:00\n\nMy note here.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.type).toBe('nota');
    expect(result.records[0]!.content).toBe('My note here.');
  });

  // ── Duplicados ──────────────────────────────────────────────────────────

  it('deve extrair todos os registros incluindo duplicados', () => {
    const buffer = readFixture('sample-duplicates.txt');
    const result = parseClippingsFile(buffer);

    // O parser extrai todos os registros; a deduplicação é feita depois
    expect(result.records).toHaveLength(2);
    expect(result.records[0]!.content).toBe('Este registro aparece duas vezes.');
    expect(result.records[1]!.content).toBe('Este registro aparece duas vezes.');
  });

  // ── Registros inválidos ─────────────────────────────────────────────────

  it('deve contar registros inválidos', () => {
    const buffer = readFixture('sample-invalid.txt');
    const result = parseClippingsFile(buffer);

    expect(result.records).toHaveLength(0);
    expect(result.invalidCount).toBe(2);
    expect(result.totalBlocks).toBe(2);
  });

  // ── Páginas ─────────────────────────────────────────────────────────────

  it('deve extrair número da página quando disponível', () => {
    const content =
      'Livro (Autor)\n- Seu destaque na página 42 | Adicionado: quarta, 4 de janeiro de 2025 12:00:00\n\nTexto.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.page).toBe(42);
  });

  it('deve parsear formato "ou posição" (variação regional do Kindle em PT)', () => {
    const content =
      'Livro (Autor)\n- Seu destaque ou posição 15-20 | Adicionado: segunda, 25 de novembro de 2024 10:15:22\n\nTexto destacado.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records).toHaveLength(1);
    const record = result.records[0]!;
    expect(record.type).toBe('destaque');
    expect(record.locationStart).toBe(15);
    expect(record.locationEnd).toBe(20);
    expect(record.kindleDate).toContain('2024-11-25');
  });

  it('deve parsear formato com página e posição combinados', () => {
    const content =
      'Livro (Autor)\n- Seu destaque na página 11 | posição 115-117 | Adicionado: domingo, 29 de dezembro de 2024 19:22:28\n\nConteúdo.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records).toHaveLength(1);
    const record = result.records[0]!;
    expect(record.type).toBe('destaque');
    expect(record.page).toBe(11);
    expect(record.locationStart).toBe(115);
    expect(record.locationEnd).toBe(117);
  });

  it('deve parsear marcador no formato "ou posição" sem range', () => {
    const content =
      'Livro (Autor)\n- Seu marcador ou posição 138 | Adicionado: segunda-feira, 25 de novembro de 2024 22:27:58\n\n';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records).toHaveLength(1);
    const record = result.records[0]!;
    expect(record.type).toBe('marcador');
    expect(record.locationStart).toBe(138);
    expect(record.locationEnd).toBe(138);
    expect(record.content).toBe('');
  });

  it('deve parsear nota no formato "ou posição"', () => {
    const content =
      'Livro (Autor)\n- Sua nota ou posição 42 | Adicionado: quinta-feira, 28 de novembro de 2024 22:49:07\n\nMinha anotação.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records).toHaveLength(1);
    const record = result.records[0]!;
    expect(record.type).toBe('nota');
    expect(record.locationStart).toBe(42);
    expect(record.locationEnd).toBe(42);
    expect(record.content).toBe('Minha anotação.');
  });

  // ── Validação de tamanho ────────────────────────────────────────────────

  it('deve rejeitar arquivos que excedem o tamanho máximo', () => {
    // Cria um buffer maior que 1KB com limite de 1KB
    const largeBuffer = Buffer.alloc(2 * 1024, 'x');

    expect(() => parseClippingsFile(largeBuffer, { maxFileSize: 1024 })).toThrow(
      'Arquivo excede o tamanho máximo',
    );
  });

  // ── toRawClipping ───────────────────────────────────────────────────────

  it('deve converter RawRecord para RawClipping', () => {
    const buffer = readFixture('sample-lf.txt');
    const result = parseClippingsFile(buffer);

    const clipping = toRawClipping(result.records[0]!);

    expect(clipping.title).toBe('A boa sorte');
    expect(clipping.author).toBe('Álex Rovira Celma;Fernando Trías de Bes');
    expect(clipping.type).toBe('destaque');
    expect(clipping.locationStart).toBe(8);
    expect(clipping.locationEnd).toBe(9);
    expect(clipping.kindleDate).toBeTruthy();
  });

  // ── Agrupamento por livro ───────────────────────────────────────────────

  it('deve retornar registros agrupáveis por título do livro', () => {
    const buffer = readFixture('sample-lf.txt');
    const result = parseClippingsFile(buffer);

    // Agrupa por título manualmente para verificar
    const byBook = new Map<string, number>();
    for (const r of result.records) {
      byBook.set(r.title, (byBook.get(r.title) ?? 0) + 1);
    }

    expect(byBook.get('A boa sorte')).toBe(2);
    expect(byBook.get('O Poder do Hábito')).toBe(2);
    expect(byBook.get('A Arte da Guerra')).toBe(1);
  });

  // ── Datas ───────────────────────────────────────────────────────────────

  it('deve parsear datas no formato português', () => {
    const content =
      'Livro (Autor)\n- Seu destaque na posição 10-15 | Adicionado: segunda, 25 de novembro de 2024 10:15:22\n\nTexto.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.kindleDate).toContain('2024-11-25');
  });

  it('deve parsear datas no formato "marco" (sem cedilha)', () => {
    const content =
      'Livro (Autor)\n- Seu destaque na posição 10-15 | Adicionado: sábado, 15 de marco de 2024 10:00:00\n\nTexto.';
    const result = parseClippingsFile(Buffer.from(content, 'utf-8'));

    expect(result.records[0]!.kindleDate).toContain('2024-03-15');
  });

  // ── Notas fragmentadas (bug do Kindle: cada tecla gera um registro) ──────

  it('deve extrair todos os fragmentos de uma nota digitada no Kindle (sem deduplicar)', () => {
    // Simula o bug do Kindle: cada keystroke ao digitar uma nota
    // gera um novo registro com o conteúdo incremental
    const fragments = [
      {
        content: 'Esss td',
        date: 'quinta-feira, 1 de janeiro de 2026 22:11:50',
      },
      {
        content: 'Esss trecho',
        date: 'quinta-feira, 1 de janeiro de 2026 22:11:58',
      },
      {
        content: 'Esss trecho combina com o senso de comunidade',
        date: 'quinta-feira, 1 de janeiro de 2026 22:12:18',
      },
      {
        content: 'Esss trecho combina com o senso de comunidade ditado por Adler',
        date: 'quinta-feira, 1 de janeiro de 2026 22:12:24',
      },
    ];

    const records = fragments.map(
      (f) =>
        `O Pequeno Manual Estoico (Salzgeber, Jonas)\n- Sua nota na página 72 | posição 739 | Adicionado: ${f.date}\n\n${f.content}`,
    );

    const fileContent = records.join('\n==========\n');
    const result = parseClippingsFile(Buffer.from(fileContent, 'utf-8'));

    // O parser NÃO deve deduplicar — extrai todos os registros fielmente
    expect(result.records).toHaveLength(4);
    expect(result.records[0]!.content).toBe('Esss td');
    // Data local 22:11:50 BRT (UTC-3) → 01:11:50 UTC do dia seguinte
    expect(result.records[0]!.kindleDate).toMatch(/2026-01-02T01:11:5\d/);
    expect(result.records[3]!.content).toBe(
      'Esss trecho combina com o senso de comunidade ditado por Adler',
    );
    // Data local 22:12:24 BRT (UTC-3) → 01:12:24 UTC do dia seguinte
    expect(result.records[3]!.kindleDate).toMatch(/2026-01-02T01:12:2\d/);

    // Todos os registros têm mesma página e localização
    for (const r of result.records) {
      expect(r!.page).toBe(72);
      expect(r!.locationStart).toBe(739);
      expect(r!.type).toBe('nota');
    }
  });
});
