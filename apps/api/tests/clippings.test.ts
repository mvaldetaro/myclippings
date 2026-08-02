import { describe, it, expect, afterEach } from 'vitest';
import { createTestApp, registerAndLogin } from './helpers';
import type { FastifyInstance } from 'fastify';

describe('Clippings Routes', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('GET /clippings/:bookId returns 401 without auth', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({
      method: 'GET',
      url: '/clippings/some-book-id',
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /clippings/:bookId returns clippings for an imported book', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Importa um arquivo
    const boundary = '---testboundary';
    const fileContent = 'Quote Book (Quote Author)\n- Seu destaque na posição 135-138 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nNot all those who wander are lost.\n==========\n';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const bookId = importRes.json().updatedBooks[0];

    const res = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}`,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const { clippings } = res.json();
    expect(clippings).toHaveLength(1);
    expect(clippings[0].content).toBe('Not all those who wander are lost.');
    expect(clippings[0].type).toBe('destaque');
  });

  it('GET /clippings/:bookId filters by type', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    // Importa com destaque e nota
    const boundary = '---testboundary';
    const fileContent = `Filter Book (Filter Author)
- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00

Highlight content.
==========
Filter Book (Filter Author)
- Sua nota na posição 3-4 | Adicionado: Sexta-feira, 20 de julho de 2026 21:31:00

Note content.
==========`;
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const bookId = importRes.json().updatedBooks[0];

    // Filtra por nota
    const res = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}?type=nota`,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const { clippings } = res.json();
    expect(clippings).toHaveLength(1);
    expect(clippings[0].type).toBe('nota');
    expect(clippings[0].content).toBe('Note content.');
  });

  it('GET /clippings/:bookId filters by text search', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const boundary = '---testboundary';
    const fileContent = `Search Book (Search Author)
- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00

The quick brown fox jumps over the lazy dog.
==========
Search Book (Search Author)
- Seu destaque na posição 3-4 | Adicionado: Sexta-feira, 20 de julho de 2026 21:31:00

Something completely different.
==========`;
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const bookId = importRes.json().updatedBooks[0];

    // Busca por "fox"
    const res = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}?text=fox`,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const { clippings } = res.json();
    expect(clippings).toHaveLength(1);
    expect(clippings[0].content).toContain('fox');
  });

  it('GET /clippings/:bookId/:clipId returns a single clipping', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app);

    const boundary = '---testboundary';
    const fileContent = 'Single Book (Single Author)\n- Seu destaque na posição 10-12 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nA specific clipping.\n==========\n';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token },
    });

    const bookId = importRes.json().updatedBooks[0];

    // Pega os clippings primeiro para obter o ID
    const listRes = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}`,
      cookies: { token },
    });

    const clipId = listRes.json().clippings[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}/${clipId}`,
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);
    const clipping = res.json();
    expect(clipping.content).toBe('A specific clipping.');
    expect(clipping.id).toBe(clipId);
  });

  it('GET /clippings/:bookId returns 403 for book owned by another user', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    // User A importa
    const { token: tokenA } = await registerAndLogin(app, {
      email: 'a@test.com',
    });

    const boundary = '---testboundary';
    const fileContent = 'Shared Book (Shared Author)\n- Seu destaque na posição 1-2 | Adicionado: Sexta-feira, 20 de julho de 2026 21:30:00\n\nContent.\n==========\n';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="My Clippings.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const importRes = await app.inject({
      method: 'POST',
      url: '/imports',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
      cookies: { token: tokenA },
    });

    const bookId = importRes.json().updatedBooks[0];

    // User B tenta acessar
    const { token: tokenB } = await registerAndLogin(app, {
      name: 'User B',
      email: 'b@test.com',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/clippings/${bookId}`,
      cookies: { token: tokenB },
    });

    expect(res.statusCode).toBe(403);
  });
});
