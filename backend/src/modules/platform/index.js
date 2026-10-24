/**
 * platform/index.js
 * PUBLIC API for the platform module.
 * This is the ONLY file other modules may import from platform.
 * Do not import middleware.js, errors.js, etc. directly from outside.
 */

// Errors
export { AppError } from './errors.js';
export { errorHandler } from './error-handler.js';

// Logger
export { logger } from './logger.js';

// Middleware
export { requireAuth, requireRole, scopeDepartment, validate } from './middleware.js';

// Infrastructure
export { events } from './events.js';
export { cache } from './cache.js';
export { featureEnabled } from './feature-flags.js';

// Utils
export * as money from './money.js';
export * as dates from './dates.js';
