import { describe, it, expect, afterEach } from 'vitest';
import { createTestApp, registerAndLogin } from './helpers';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';

/** Gera um My Clippings.txt de exemplo com um destaque */
function generateClippingsFile(clippings: string[]): Buffer {
  return Buffer.from(clippings.join('\n==========\n'), 'utf-8');
}

/** Cria um clipping individual no formato do Kindle */
function makeClipping(opts: {
  title: string;
  author: string;
  type?: string;
  content: string;
  page?: string;
  location?: string;
  date?: string;
}): string {
  const type = opts.type ?? 'Destaque';
  const page = opts.page ? `na página ${opts.page} | ` : '';
  const location = opts.location ?? '135-138';
  const date = opts.date ?? 'Sexta-feira, 20 de julho de 2026 21:30:00';
  return `${opts.title} (${opts.author})\n- Seu ${type.toLowerCase()} ${page}na posição ${location} | Adicionado: ${date}\n\n${opts.content}`;
}

describe('Import Routes', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('POST /imports returns 401 without auth', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({
      method: 'POST',
      url: '/api/imports',
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /imports returns 400 when no file is sent', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/imports',
      cookies: { token },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /imports processes a valid clippings file', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const clip = makeClipping({
      title: 'Clean Code',
      author: 'Robert C. Martin',
      content: 'The only way to go fast is to go well.',
    });

    const fileContent = generateClippingsFile([clip]);
    const boundary = '---testboundary';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent.toString('utf-8')}\r\n--${boundary}--`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.status).toBe('completed');
    expect(result.importedRecords).toBeGreaterThanOrEqual(1);
    expect(result.updatedBooks).toHaveLength(1);
  });

  it('POST /imports does not duplicate clippings on re-import', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const clip = makeClipping({
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      content: "Don't live with broken windows.",
    });

    const fileContent = generateClippingsFile([clip]);
    const boundary = '---testboundary';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent.toString('utf-8')}\r\n--${boundary}--`;

    // Primeira importação
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res1.statusCode).toBe(200);
    expect(res1.json().importedRecords).toBe(1);

    // Segunda importação (mesmo arquivo)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res2.statusCode).toBe(200);
    expect(res2.json().duplicateRecords).toBe(1);
    expect(res2.json().importedRecords).toBe(0);
  });

  it('POST /imports handles multiple books in one file', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const clip1 = makeClipping({
      title: 'Book One',
      author: 'Author A',
      content: 'Content from book one.',
    });

    const clip2 = makeClipping({
      title: 'Book Two',
      author: 'Author B',
      content: 'Content from book two.',
    });

    const fileContent = generateClippingsFile([clip1, clip2]);
    const boundary = '---testboundary';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent.toString('utf-8')}\r\n--${boundary}--`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.importedRecords).toBe(2);
    expect(result.updatedBooks).toHaveLength(2);
  });

  it('POST /imports deduplicates fragmented notes (Kindle typing bug)', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Simula o bug: fragmentos progressivos de uma nota sendo digitada,
    // todos com mesma página/posição e timestamps ~2s de diferença
    const noteFragments = [
      makeClipping({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        type: 'Nota',
        content: 'Esss td',
        page: '72',
        location: '739',
        date: 'quinta-feira, 1 de janeiro de 2026 22:11:50',
      }),
      makeClipping({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        type: 'Nota',
        content: 'Esss trecho',
        page: '72',
        location: '739',
        date: 'quinta-feira, 1 de janeiro de 2026 22:11:58',
      }),
      makeClipping({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        type: 'Nota',
        content: 'Esss trecho combina com o senso de comunidade',
        page: '72',
        location: '739',
        date: 'quinta-feira, 1 de janeiro de 2026 22:12:18',
      }),
      makeClipping({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        type: 'Nota',
        content: 'Esss trecho combina com o senso de comunidade ditado por Adler',
        page: '72',
        location: '739',
        date: 'quinta-feira, 1 de janeiro de 2026 22:12:28',
      }),
    ];

    // Adiciona um destaque legítimo (mesmo livro, posição diferente)
    const highlight = makeClipping({
      title: 'Clean Code',
      author: 'Robert C. Martin',
      type: 'Destaque',
      content: 'The only way to go fast is to go well.',
      page: '74',
      location: '772-773',
      date: 'sexta-feira, 2 de janeiro de 2026 19:07:11',
    });

    const fileContent = generateClippingsFile([...noteFragments, highlight]);
    const boundary = '---testboundary';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent.toString('utf-8')}\r\n--${boundary}--`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.status).toBe('completed');
    // Apenas 2 registros: 1 nota (mais recente/completa) + 1 destaque
    expect(result.importedRecords).toBe(2);
    // Os outros 3 fragmentos devem ser contados como duplicados
    expect(result.duplicateRecords).toBe(3);
  });
});
