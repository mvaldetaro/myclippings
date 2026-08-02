import { describe, it, expect, afterEach } from 'vitest';
import { createTestApp, registerAndLogin } from './helpers';
import type { FastifyInstance } from 'fastify';

describe('Books Routes', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('GET /books returns 401 without auth', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({ method: 'GET', url: '/api/books' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /books returns empty list when no books imported', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/books',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().books).toEqual([]);
  });

  it('GET /books lists imported books', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Importa um arquivo primeiro
    const boundary = '---testboundary';
    const fileContent =
      'Book Title (Author Name)\n- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nContent.\n==========\n';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/books',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const { books } = res.json();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Book Title');
    expect(books[0].author).toBe('Author Name');
    expect(books[0].clippingCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /books supports search query param', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Importa dois livros
    const boundary1 = '---b1';
    const f1 =
      'Alpha Book (First Author)\n- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nA.\n==========\n';
    const b1 = `--${boundary1}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${f1}\r\n--${boundary1}--`;

    await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary1}` },
      body: b1,
      cookies: { token },
    });

    const boundary2 = '---b2';
    const f2 =
      'Beta Book (Second Author)\n- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 22:00:00\n\nB.\n==========\n';
    const b2 = `--${boundary2}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings 2.txt"\r\nContent-Type: text/plain\r\n\r\n${f2}\r\n--${boundary2}--`;

    await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary2}` },
      body: b2,
      cookies: { token },
    });

    // Busca por "Alpha"
    const res = await app.inject({
      method: 'GET',
      url: '/api/books?search=Alpha',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const { books } = res.json();
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Alpha Book');
  });

  it('GET /books/:bookId/download returns the Markdown file', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Importa
    const boundary = '---testboundary';
    const fileContent =
      'Download Book (DL Author)\n- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nContent for download.\n==========\n';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/api/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const bookId = importRes.json().updatedBooks[0];

    const res = await app.inject({
      method: 'GET',
      url: `/api/books/${bookId}/download`,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.body).toContain('Content for download');
    expect(res.body).toContain('# Download Book');
  });
});
