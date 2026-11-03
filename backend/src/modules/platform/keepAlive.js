/**
 * backend/src/modules/platform/keepAlive.js
 * Automatic keep-alive ping for free-tier cloud hosts (e.g. Render, Railway).
 * Render's free tier spins down web services after 15 minutes of inactivity.
 * Pinging the service's public URL every 10-12 minutes resets Render's idle timer,
 * keeping the server active 24/7.
 */
import { logger } from './logger.js';

let keepAliveTimer = null;

/**
 * Resolves the target URL to ping.
 * Priority: KEEP_ALIVE_URL > RENDER_EXTERNAL_URL (automatically provided by Render).
 */
export function resolveKeepAliveUrl() {
  const url = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!url) return null;
  const normalized = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;
  return normalized.replace(/\/+$/, '');
}

/**
 * Pings the given URL with a timeout.
 */
export async function ping(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Render-KeepAlive/1.0' },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      logger.info(`[KeepAlive] Ping successful (${res.status}) to ${url}`);
    } else {
      logger.warn(`[KeepAlive] Ping returned status ${res.status} from ${url}`);
    }
    return res.status;
  } catch (err) {
    logger.warn({ err: err.message }, `[KeepAlive] Ping attempt to ${url} failed`);
    return null;
  }
}

/**
 * Starts the keep-alive interval.
 * Uses .unref() so it does not prevent graceful process termination.
 */
export function startKeepAlive() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (process.env.KEEP_ALIVE_ENABLED === 'false') {
    logger.info('[KeepAlive] Disabled via KEEP_ALIVE_ENABLED=false');
    return null;
  }

  const baseUrl = resolveKeepAliveUrl();
  if (!baseUrl) {
    logger.info('[KeepAlive] No KEEP_ALIVE_URL or RENDER_EXTERNAL_URL configured; self-ping disabled');
    return null;
  }

  const pingUrl = `${baseUrl}/health`;
  const intervalMinutes = Math.max(1, parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '12', 10));
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(`[KeepAlive] Scheduled self-ping to ${pingUrl} every ${intervalMinutes}m`);

  // First ping after 30 seconds to allow cold boot to complete
  const initialTimeout = setTimeout(() => {
    ping(pingUrl);
  }, 30000);
  if (initialTimeout && typeof initialTimeout.unref === 'function') {
    initialTimeout.unref();
  }

  keepAliveTimer = setInterval(() => {
    ping(pingUrl);
  }, intervalMs);

  if (keepAliveTimer && typeof keepAliveTimer.unref === 'function') {
    keepAliveTimer.unref();
  }

  return keepAliveTimer;
}

/**
 * Stops the keep-alive interval.
 */
export function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

