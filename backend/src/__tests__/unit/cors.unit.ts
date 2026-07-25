/**
 * CORS Middleware Unit Tests
 *
 * Covers the allowlist wired into server.ts: allowed origins get a matching
 * Access-Control-Allow-Origin, disallowed origins get a 403 rather than a 500,
 * and originless requests pass through.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCorsMiddleware, parseAllowedOrigins } from '../../middleware/cors.js';

const ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000'];

function buildApp() {
  const app = express();
  app.use(...createCorsMiddleware(ORIGINS));
  app.post('/graphql', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('parseAllowedOrigins', () => {
  it('splits and trims a comma-separated list', () => {
    expect(parseAllowedOrigins('http://a.test , http://b.test')).toEqual([
      'http://a.test',
      'http://b.test',
    ]);
  });

  it('falls back to the local dev ports when unset', () => {
    expect(parseAllowedOrigins('')).toEqual(ORIGINS);
  });
});

describe('createCorsMiddleware', () => {
  for (const origin of ORIGINS) {
    it(`allows preflight from ${origin}`, async () => {
      const res = await request(buildApp())
        .options('/graphql')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });
  }

  it('rejects a disallowed preflight with 403, not 500', async () => {
    const res = await request(buildApp())
      .options('/graphql')
      .set('Origin', 'http://localhost:9999')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not echo the rejected origin back in the body', async () => {
    const res = await request(buildApp()).post('/graphql').set('Origin', 'http://evil.test');

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('evil.test');
  });

  it('allows requests with no Origin header', async () => {
    const res = await request(buildApp()).post('/graphql');
    expect(res.status).toBe(200);
  });
});
