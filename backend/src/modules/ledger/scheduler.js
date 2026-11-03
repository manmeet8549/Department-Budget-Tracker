/**
 * backend/src/modules/ledger/scheduler.js
 * Background scheduler for periodic audit anchoring.
 * Runs only if LEDGER_ENABLED=true and not in test environment.
 * Uses .unref() so it does not block graceful process termination.
 */

import { logger } from '../platform/index.js';
import { getLedgerConfig } from './config.js';
import { anchorPending } from './service.js';

let timer = null;

export function startLedgerScheduler() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const config = getLedgerConfig();
  if (!config.enabled || config.chain === 'disabled') {
    logger.info('[LedgerScheduler] Ledger background scheduler disabled (LEDGER_ENABLED=false or chain=disabled)');
    return null;
  }

  const intervalMs = (config.intervalSeconds || 300) * 1000;
  logger.info(`[LedgerScheduler] Starting periodic anchoring every ${config.intervalSeconds}s`);

  // Run initial check after a short delay, then on interval
  timer = setInterval(async () => {
    try {
      const res = await anchorPending();
      if (res && res.created) {
        logger.info(`[LedgerScheduler] Successfully anchored block #${res.block.blockNo}`);
      }
    } catch (err) {
      logger.error({ err: err.message }, '[LedgerScheduler] Periodic anchor error');
    }
  }, intervalMs);

  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

export function stopLedgerScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

