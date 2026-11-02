/**
 * backend/src/modules/ledger/config.js
 * Ledger configuration and startup validation.
 */

import { HARDHAT_DEV_KEY } from './chain/client.js';

export function getLedgerConfig(env = process.env) {
  const enabled =
    env.enabled !== undefined
      ? Boolean(env.enabled)
      : (env.LEDGER_ENABLED ?? 'false') === 'true';

  const chain = (
    env.chain ||
    env.LEDGER_CHAIN ||
    'disabled'
  ).toLowerCase();

  const settleSeconds = Number(
    env.settleSeconds ?? env.LEDGER_SETTLE_SECONDS ?? 300
  );
  const batchMax = Number(env.batchMax ?? env.LEDGER_BATCH_MAX ?? 100);
  const intervalSeconds = Number(
    env.intervalSeconds ?? env.LEDGER_INTERVAL_SECONDS ?? 300
  );
  const confirmations = Number(
    env.confirmations ?? env.LEDGER_CONFIRMATIONS ?? 1
  );

  let defaultExpectedChainId = 31337;
  if (chain === 'sepolia') defaultExpectedChainId = 11155111;
  if (chain === 'amoy') defaultExpectedChainId = 80002;

  const expectedChainId = Number(
    env.expectedChainId ?? env.LEDGER_EXPECTED_CHAIN_ID ?? defaultExpectedChainId
  );

  const rpcUrl =
    env.rpcUrl ||
    env.LEDGER_RPC_URL ||
    (chain === 'local' ? 'http://127.0.0.1:8545' : '');

  const contractAddress =
    env.contractAddress || env.LEDGER_CONTRACT_ADDRESS || '';

  const privateKey =
    env.privateKey || env.LEDGER_SIGNER_PRIVATE_KEY || '';

  const explorerBaseUrl =
    env.explorerBaseUrl || env.LEDGER_EXPLORER_BASE_URL || '';

  return {
    enabled,
    chain,
    rpcUrl,
    contractAddress,
    privateKey,
    expectedChainId,
    confirmations,
    explorerBaseUrl,
    settleSeconds,
    batchMax,
    intervalSeconds,
  };
}

/**
 * Validates configuration at startup.
 * Fails fast with clear error message if anything is missing or insecure.
 */
export function validateLedgerConfig(env = process.env) {
  const config = getLedgerConfig(env);

  if (!config.enabled || config.chain === 'disabled') {
    return { valid: true, config };
  }

  const validChains = ['disabled', 'local', 'sepolia', 'amoy'];
  if (!validChains.includes(config.chain)) {
    throw new Error(
      `Invalid LEDGER_CHAIN "${config.chain}". Must be one of: ${validChains.join(', ')}`
    );
  }

  if (!config.rpcUrl) {
    throw new Error('LEDGER_RPC_URL is required when ledger is enabled');
  }

  if (!config.contractAddress) {
    throw new Error('LEDGER_CONTRACT_ADDRESS is required when ledger is enabled');
  }

  if (!config.privateKey) {
    throw new Error('LEDGER_SIGNER_PRIVATE_KEY is required when ledger is enabled');
  }

  // Validate private key format (must be 0x followed by 64 hex characters)
  if (!/^0x[0-9a-fA-F]{64}$/.test(config.privateKey)) {
    throw new Error(
      'LEDGER_PRIVATE_KEY must be a 32-byte hex string (0x followed by 64 hex characters)'
    );
  }

  // Refuse well-known Hardhat dev key on non-local networks
  const cleanKey = config.privateKey.toLowerCase();
  if (config.chain !== 'local' && cleanKey === HARDHAT_DEV_KEY) {
    throw new Error(
      'SECURITY VIOLATION: well-known Hardhat default private key is strictly refused on non-local network: ' + config.chain
    );
  }

  return { valid: true, config };
}
