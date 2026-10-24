/**
 * platform/error-handler.js
 * Global Express error middleware.
 * Every service throws AppError; unknown errors are wrapped as 500.
 * Format: { success: false, error: { code, message, details } }
 */
import { AppError } from './errors.js';
import { logger } from './logger.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    // Known operational error
    if (err.status >= 500) {
      logger.error({ err }, 'AppError 5xx');
    }
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unknown / programming error — log it and return generic 500
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: {},
    },
  });
}
