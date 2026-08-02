import { describe, it, expect, afterEach } from 'vitest';
import { createTestApp } from './helpers';
import type { FastifyInstance } from 'fastify';

describe('Health Routes', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it('GET /health returns 200 for liveness', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns 200 when DB and filesystem are accessible', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({ method: 'GET', url: '/api/health/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.checks.database).toBe('ok');
    expect(body.checks.filesystem).toBe('ok');
  });

  it('GET /health includes correlation-id header', async () => {
    const testCtx = await createTestApp();
    app = testCtx.app;
    cleanup = testCtx.cleanup;

    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-correlation-id']).toBeDefined();
  });
});
