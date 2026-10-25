/**
 * src/app.js
 * Express application factory.
 * Returns the configured app — separate from server.js so Supertest can import it.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './modules/platform/index.js';
import { healthRouter } from './routes/health.js';
import { authRouter, usersRouter } from './modules/auth/index.js';
import { auditRouter } from './modules/audit/index.js';
import { masterRouter } from './modules/master/index.js';
import { budgetsRouter } from './modules/budgets/index.js';
import { balancesRouter } from './modules/balances/index.js';
import { expensesRouter } from './modules/expenses/index.js';
import { dashboardRouter } from './modules/dashboard/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // ── Security & parsing ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1', auditRouter);
  app.use('/api/v1', masterRouter);
  app.use('/api/v1/budgets', budgetsRouter);
  app.use('/api/v1/balances', balancesRouter);
  app.use('/api/v1/expenses', expensesRouter);
  app.use('/api/v1/dashboard', dashboardRouter);

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
