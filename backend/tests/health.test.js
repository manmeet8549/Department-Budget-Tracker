/**
 * tests/health.test.js
 * API test: GET /api/v1/health returns 200 with { status: 'ok' }
 * Written BEFORE implementation (TDD — this fails first)
 */
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/v1/health', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });

  it('returns { success: true, data: { status: "ok" } }', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body).toMatchObject({
      success: true,
      data: { status: 'ok' },
    });
  });

  it('includes a version field', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data).toHaveProperty('version');
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
