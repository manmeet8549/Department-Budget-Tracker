/**
 * backend/src/modules/ledger/index.js
 * Public API for the ledger module.
 * Other modules may only import from this file.
 */

export {
  getStatus,
  listBlocks,
  anchorPending,
  retryBlock,
  verifyAll,
  getProof,
} from './service.js';

export { ledgerRouter } from './routes.js';
export { startLedgerScheduler, stopLedgerScheduler } from './scheduler.js';
export { getLedgerConfig, validateLedgerConfig } from './config.js';
export {
  getChainClient,
  setChainClient,
  resetChainClient,
  FakeChainClient,
  DisabledChainClient,
  EvmChainClient,
} from './chain/client.js';
export { canonicalize } from './pure/canonical.js';
export {
  hashLeaf,
  buildTree,
  getRoot,
  getProof as getMerkleProof,
  verifyProof,
  computeBlockHash,
  GENESIS_PREV_BLOCK_HASH,
} from './pure/merkle.js';

