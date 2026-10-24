/**
 * platform/logger.js
 * Pino logger instance — shared across all modules.
 * No console.log in committed code; use logger.info(), logger.error(), etc.
 * Secrets and tokens must never appear in log fields.
 */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  ...(process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
});
