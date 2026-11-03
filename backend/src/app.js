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
import { budgetsRouter, budgetCeilingsRouter } from './modules/budgets/index.js';
import { balancesRouter } from './modules/balances/index.js';
import { expensesRouter } from './modules/expenses/index.js';
import { dashboardRouter } from './modules/dashboard/index.js';
import { ledgerRouter } from './modules/ledger/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Trust reverse proxy (Render, Vercel, Nginx) for secure cookies & HTTPS detection
  app.set('trust proxy', 1);

  // ── Security & parsing ──────────────────────────────────────────────────────
  app.use(helmet());

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, health probes, curl)
        if (!origin) return callback(null, true);

        const isExplicitlyAllowed = allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;
          return false;
        });

        if (isExplicitlyAllowed) return callback(null, true);

        // Allow localhost origins in development / test
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          return callback(null, true);
        }

        // Allow *.vercel.app preview deployments if enabled
        if (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // ── Root & health probes ────────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Department Budget Spending Tracker API is running',
      health: '/health',
      docs: '/api/docs',
    });
  });
  app.use('/health', healthRouter);
  app.use('/api/v1', healthRouter);

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1', auditRouter);
  app.use('/api/v1', masterRouter);
  app.use('/api/v1/budgets', budgetsRouter);
  app.use('/api/v1/budget-ceilings', budgetCeilingsRouter);
  app.use('/api/v1/balances', balancesRouter);
  app.use('/api/v1/expenses', expensesRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/ledger', ledgerRouter);

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
