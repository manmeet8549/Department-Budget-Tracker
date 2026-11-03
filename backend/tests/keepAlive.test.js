/**
 * backend/tests/keepAlive.test.js
 * Unit tests for keep-alive self-ping helper, route aliases, and CORS headers.
 */
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  resolveKeepAliveUrl,
  startKeepAlive,
  stopKeepAlive,
} from '../src/modules/platform/keepAlive.js';

describe('KeepAlive Service & Health Endpoints', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    stopKeepAlive();
    process.env = originalEnv;
  });

  describe('resolveKeepAliveUrl()', () => {
    it('returns null if no keep-alive url or render url is present', () => {
      delete process.env.KEEP_ALIVE_URL;
      delete process.env.RENDER_EXTERNAL_URL;
      expect(resolveKeepAliveUrl()).toBeNull();
    });

    it('prefers KEEP_ALIVE_URL over RENDER_EXTERNAL_URL', () => {
      process.env.KEEP_ALIVE_URL = 'https://custom-pinger.example.com/';
      process.env.RENDER_EXTERNAL_URL = 'https://render.example.com/';
      expect(resolveKeepAliveUrl()).toBe('https://custom-pinger.example.com');
    });

    it('uses RENDER_EXTERNAL_URL when KEEP_ALIVE_URL is absent', () => {
      delete process.env.KEEP_ALIVE_URL;
      process.env.RENDER_EXTERNAL_URL = 'https://my-backend.onrender.com/';
      expect(resolveKeepAliveUrl()).toBe('https://my-backend.onrender.com');
    });

    it('adds https:// if missing from host name', () => {
      delete process.env.KEEP_ALIVE_URL;
      process.env.RENDER_EXTERNAL_URL = 'my-backend.onrender.com';
      expect(resolveKeepAliveUrl()).toBe('https://my-backend.onrender.com');
    });
  });

  describe('startKeepAlive() lifecycle', () => {
    it('returns null and does not start in NODE_ENV=test', () => {
      process.env.NODE_ENV = 'test';
      process.env.RENDER_EXTERNAL_URL = 'https://render.example.com';
      const timer = startKeepAlive();
      expect(timer).toBeNull();
    });

    it('returns null when KEEP_ALIVE_ENABLED=false', () => {
      process.env.NODE_ENV = 'production';
      process.env.KEEP_ALIVE_ENABLED = 'false';
      process.env.RENDER_EXTERNAL_URL = 'https://render.example.com';
      const timer = startKeepAlive();
      expect(timer).toBeNull();
    });
  });

  describe('Health & Root Routes', () => {
    let app;

    beforeAll(() => {
      app = createApp();
    });

    it('responds 200 on /health (Render default health check path)', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('responds 200 on /api/v1/health', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('responds 200 on root / with service metadata', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Department Budget Spending Tracker');
      expect(res.body.health).toBe('/health');
    });

    it('allows CORS for *.vercel.app deployment origins', async () => {
      const vercelOrigin = 'https://department-budget-tracker-i8p8j43j3-manmeet9.vercel.app';
      const res = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', vercelOrigin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(vercelOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
