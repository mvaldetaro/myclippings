import { describe, it, expect, afterEach } from 'vitest';
import { createTestApp, registerAndLogin } from './helpers';
import type { FastifyInstance } from 'fastify';

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('POST /auth/register creates a new user and returns 201', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Alice', email: 'alice@test.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Alice');
    expect(body.email).toBe('alice@test.com');
    expect(body.id).toBeDefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it('POST /auth/register returns 409 for duplicate email', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Bob', email: 'bob@test.com', password: 'password123' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Bob 2', email: 'bob@test.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('POST /auth/register returns 400 for invalid input', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: '', email: 'invalid', password: '123' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /auth/login returns user data and sets cookie with valid credentials', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Charlie', email: 'charlie@test.com', password: 'password123' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'charlie@test.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Charlie');
    expect(body.email).toBe('charlie@test.com');

    const cookies = res.cookies;
    const tokenCookie = cookies.find((c) => c.name === 'token');
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.httpOnly).toBe(true);
    expect(tokenCookie?.value).toBeTruthy();
  });

  it('POST /auth/login returns 401 with wrong password', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Dave', email: 'dave@test.com', password: 'password123' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'dave@test.com', password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/logout clears the token cookie', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const { token } = await registerAndLogin(app, {
      email: 'logout@test.com',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { token },
    });

    expect(res.statusCode).toBe(200);

    // Verifica que o cookie foi limpo
    const cookies = res.cookies;
    const tokenCookie = cookies.find((c) => c.name === 'token');
    expect(tokenCookie?.value).toBe('');
  });

  it('Protected routes return 401 without auth token', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({ method: 'GET', url: '/books' });
    expect(res.statusCode).toBe(401);
  });
});
