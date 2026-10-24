/**
 * src/app.js
 * Express application factory.
 * Returns the configured app — separate from server.js so Supertest can import it.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './modules/platform/index.js';
import { healthRouter } from './routes/health.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // ── Security & parsing ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
  app.use(express.json());

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);
  // Future module routes registered here each iteration

  // ── Swagger UI ──────────────────────────────────────────────────────────────
  try {
    const swaggerDoc = JSON.parse(
      readFileSync(join(__dirname, '../docs/openapi.json'), 'utf-8')
    );
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  } catch {
    // Swagger doc not yet present — continue without it
  }

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found', details: {} },
    });
  });

  // ── Global error handler (must be last) ─────────────────────────────────────
  app.use(errorHandler);

  return app;
}
