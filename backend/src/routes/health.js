/**
 * src/routes/health.js
 * GET /api/v1/health — liveness probe.
 * No auth required. Used by Docker health check and CI gate.
 * Documented in docs/openapi.json.
 */
import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: pkg.version,
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    },
  });
});
