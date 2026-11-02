/**
 * audit/index.js
 * PUBLIC API for audit module.
 */
export { log, search, listEntriesForLedger, getEntriesByIds } from './service.js';
export { auditRouter } from './routes.js';
