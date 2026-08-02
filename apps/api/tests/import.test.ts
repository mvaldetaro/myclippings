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
      url: '/imports',
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
      url: '/imports',
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
      url: '/imports',
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
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res1.statusCode).toBe(200);
    expect(res1.json().importedRecords).toBe(1);

    // Segunda importação (mesmo arquivo)
    const res2 = await app.inject({
      method: 'POST',
      url: '/imports',
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
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.importedRecords).toBe(2);
    expect(result.updatedBooks).toHaveLength(2);
  });
});
