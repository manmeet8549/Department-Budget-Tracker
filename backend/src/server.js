/**
 * src/server.js
 * HTTP server entry point — do NOT import this in tests.
 * Tests import createApp() from app.js directly.
 */
import { createApp } from './app.js';
import { logger } from './modules/platform/index.js';

const PORT = process.env.PORT ?? 5000;

const app = await createApp();
app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
});
