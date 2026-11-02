/**
 * backend/src/modules/ledger/chain/client.js
 * ChainClient interface and implementations:
 * - FakeChainClient: in-memory mock for backend tests (zero network calls)
 * - EvmChainClient: ethers v6 client for local Hardhat node, Sepolia, and Amoy
 * - DisabledChainClient: fallback when ledger is disabled
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../../platform/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Well-known Hardhat default test private key (Account #0).
 * Must be refused on any non-local network.
 */
export const HARDHAT_DEV_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'.toLowerCase();

/**
 * Loads the AuditAnchor contract ABI.
 */
function loadContractAbi() {
  const abiPath = join(__dirname, 'AuditAnchor.abi.json');
  if (existsSync(abiPath)) {
    return JSON.parse(readFileSync(abiPath, 'utf8'));
  }
  // Fallback minimal ABI matching AuditAnchor.sol
  return [
    'function anchor(uint256 blockNo, bytes32 merkleRoot, bytes32 prevBlockHash, bytes32 blockHash, uint32 entryCount) external',
    'function anchorCount() external view returns (uint256)',
    'function getAnchor(uint256 blockNo) external view returns (uint256, bytes32, bytes32, bytes32, uint32, uint256)',
    'function lastBlockHash() external view returns (bytes32)',
    'function owner() external view returns (address)',
    'event Anchored(uint256 indexed blockNo, bytes32 indexed merkleRoot, bytes32 blockHash, uint32 entryCount)',
  ];
}

/**
 * Abstract / Base ChainClient interface
 */
export class ChainClient {
  async getNetworkInfo() {
    throw new Error('Not implemented');
  }
  async anchor(_blockNo, _merkleRoot, _prevBlockHash, _blockHash, _entryCount) {
    throw new Error('Not implemented');
  }
  async getAnchor(_blockNo) {
    throw new Error('Not implemented');
  }
  async anchorCount() {
    throw new Error('Not implemented');
  }
}

/**
 * DisabledChainClient
 */
export class DisabledChainClient extends ChainClient {
  async getNetworkInfo() {
    return {
      name: 'disabled',
      chainId: null,
      isTestnet: false,
      contractAddress: null,
      explorerBaseUrl: null,
    };
  }

  async anchor() {
    throw new AppError('LEDGER_NOT_CONFIGURED', 'Blockchain ledger anchoring is disabled or not configured', 409);
  }

  async getAnchor() {
    return null;
  }

  async anchorCount() {
    return 0;
  }
}

/**
 * FakeChainClient: in-memory simulated blockchain for tests.
 * Absolutely zero network calls.
 */
export class FakeChainClient extends ChainClient {
  constructor(options = {}) {
    super();
    this.name = options.name || 'local';
    this.chainId = options.chainId || 31337;
    this.isTestnet = true;
    this.contractAddress = options.contractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    this.explorerBaseUrl = options.explorerBaseUrl || null;
    this.anchors = new Map();
    this.currentBlockNumber = 1000n;
    this.simulatedError = null;
  }

  setSimulatedError(err) {
    this.simulatedError = err;
  }

  setFailNext(val = true, msg = 'Simulated chain failure') {
    this.simulatedError = val ? new Error(msg) : null;
  }

  clear() {
    this.anchors.clear();
    this.currentBlockNumber = 1000n;
    this.simulatedError = null;
  }

  async getNetworkInfo() {
    return {
      name: this.name,
      chainId: this.chainId,
      isTestnet: this.isTestnet,
      contractAddress: this.contractAddress,
      explorerBaseUrl: this.explorerBaseUrl,
    };
  }

  async anchor(blockNo, merkleRoot, prevBlockHash, blockHash, entryCount) {
    if (this.simulatedError) {
      const err = this.simulatedError;
      this.simulatedError = null;
      throw err;
    }

    const bNo = BigInt(blockNo);
    const expectedBlockNo = BigInt(this.anchors.size + 1);
    if (bNo !== expectedBlockNo) {
      throw new Error(`Invalid block number: expected ${expectedBlockNo}, got ${bNo}`);
    }

    if (this.anchors.size === 0) {
      const zeroBytes32 = '0x' + '00'.repeat(32);
      if (prevBlockHash.toLowerCase() !== zeroBytes32) {
        throw new Error('First block must have zero prevBlockHash');
      }
    } else {
      const lastAnchor = this.anchors.get(Number(this.anchors.size));
      if (lastAnchor && prevBlockHash.toLowerCase() !== lastAnchor.blockHash.toLowerCase()) {
        throw new Error('prevBlockHash does not match last blockHash');
      }
    }

    this.currentBlockNumber += 1n;
    const txHash = '0x' + crypto.createHash('sha256').update(`${bNo}-${Date.now()}-${Math.random()}`).digest('hex');
    const anchoredAt = new Date();

    const record = {
      blockNo: Number(bNo),
      merkleRoot: merkleRoot.toLowerCase(),
      prevBlockHash: prevBlockHash.toLowerCase(),
      blockHash: blockHash.toLowerCase(),
      entryCount: Number(entryCount),
      anchoredAt,
      txHash,
      chainBlockNumber: this.currentBlockNumber,
    };

    this.anchors.set(Number(bNo), record);

    return {
      txHash,
      chainBlockNumber: this.currentBlockNumber,
      anchoredAt,
    };
  }

  async getAnchor(blockNo) {
    const num = Number(blockNo);
    const a = this.anchors.get(num);
    if (!a) {
      return null;
    }
    return { ...a };
  }

  async anchorCount() {
    return this.anchors.size;
  }

  // Test mutation helper: remove or tamper with on-chain anchor
  tamperAnchor(blockNo, updates) {
    const num = Number(blockNo);
    const existing = this.anchors.get(num);
    if (existing) {
      this.anchors.set(num, { ...existing, ...updates });
    }
  }

  removeAnchor(blockNo) {
    this.anchors.delete(Number(blockNo));
  }
}

/**
 * EvmChainClient: Real blockchain interaction with ethers v6.
 */
export class EvmChainClient extends ChainClient {
  constructor(config) {
    super();
    this.name = config.LEDGER_CHAIN;
    this.rpcUrl = config.LEDGER_RPC_URL;
    this.contractAddress = config.LEDGER_CONTRACT_ADDRESS;
    this.privateKey = config.LEDGER_SIGNER_PRIVATE_KEY;
    this.expectedChainId = Number(config.LEDGER_EXPECTED_CHAIN_ID || 31337);
    this.confirmations = Number(config.LEDGER_CONFIRMATIONS || 1);
    this.explorerBaseUrl = config.LEDGER_EXPLORER_BASE_URL || null;
    this.isTestnet = ['local', 'sepolia', 'amoy'].includes(this.name);

    if (!this.rpcUrl) {
      throw new Error('LEDGER_RPC_URL is required for EVM chain client');
    }
    if (!this.contractAddress) {
      throw new Error('LEDGER_CONTRACT_ADDRESS is required for EVM chain client');
    }
    if (!this.privateKey) {
      throw new Error('LEDGER_SIGNER_PRIVATE_KEY is required for EVM chain client');
    }

    // Refuse Hardhat's well-known dev key on non-local networks
    const cleanKey = (this.privateKey.startsWith('0x') ? this.privateKey : `0x${this.privateKey}`).toLowerCase();
    if (this.name !== 'local' && cleanKey === HARDHAT_DEV_KEY) {
      throw new Error('SECURITY VIOLATION: Hardhat default dev private key is strictly refused on non-local networks');
    }

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    this.abi = loadContractAbi();
    this.contract = new ethers.Contract(this.contractAddress, this.abi, this.wallet);
  }

  /**
   * Validates RPC connectivity and expected chain ID.
   */
  async validateNetwork() {
    try {
      const net = await this.provider.getNetwork();
      const actualChainId = Number(net.chainId);
      if (actualChainId !== this.expectedChainId) {
        throw new Error(
          `RPC Chain ID mismatch: expected ${this.expectedChainId}, got ${actualChainId} from RPC ${this.rpcUrl}`
        );
      }
    } catch (err) {
      // Sanitize any sensitive details from the error message
      const sanitized = err.message.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED_PRIVATE_KEY]');
      throw new Error(`Failed to validate EVM chain connection: ${sanitized}`);
    }
  }

  async getNetworkInfo() {
    return {
      name: this.name,
      chainId: this.expectedChainId,
      isTestnet: this.isTestnet,
      contractAddress: this.contractAddress,
      explorerBaseUrl: this.explorerBaseUrl,
    };
  }

  async anchor(blockNo, merkleRoot, prevBlockHash, blockHash, entryCount) {
    try {
      const tx = await this.contract.anchor(
        BigInt(blockNo),
        merkleRoot,
        prevBlockHash,
        blockHash,
        Number(entryCount)
      );
      const receipt = await tx.wait(this.confirmations);
      const chainBlock = await this.provider.getBlock(receipt.blockNumber);
      return {
        txHash: receipt.hash,
        chainBlockNumber: BigInt(receipt.blockNumber),
        anchoredAt: chainBlock ? new Date(chainBlock.timestamp * 1000) : new Date(),
      };
    } catch (err) {
      const safeMsg = err.message
        ? err.message.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED_KEY]')
        : 'Smart contract transaction failed';
      throw new Error(`Chain anchor execution failed: ${safeMsg}`);
    }
  }

  async getAnchor(blockNo) {
    try {
      const record = await this.contract.getAnchor(BigInt(blockNo));
      return {
        blockNo: Number(record[0]),
        merkleRoot: record[1].toLowerCase(),
        prevBlockHash: record[2].toLowerCase(),
        blockHash: record[3].toLowerCase(),
        entryCount: Number(record[4]),
        anchoredAt: new Date(Number(record[5]) * 1000),
      };
    } catch {
      return null;
    }
  }

  async anchorCount() {
    try {
      const count = await this.contract.anchorCount();
      return Number(count);
    } catch (err) {
      throw new Error(`Failed to read anchorCount from contract: ${err.message}`);
    }
  }
}

/**
 * Singleton client instance manager.
 */
let activeChainClient = null;

export function getChainClient(config = process.env) {
  if (activeChainClient) {
    return activeChainClient;
  }

  const isTest = (config.NODE_ENV ?? process.env.NODE_ENV) === 'test';
  const chain = (config.LEDGER_CHAIN ?? process.env.LEDGER_CHAIN ?? 'disabled').toLowerCase();
  const enabled = (config.LEDGER_ENABLED ?? process.env.LEDGER_ENABLED ?? 'false') === 'true';

  if (isTest) {
    // Tests always use in-memory FakeChainClient (never touches the network)
    activeChainClient = new FakeChainClient();
    return activeChainClient;
  }

  if (!enabled || chain === 'disabled') {
    activeChainClient = new DisabledChainClient();
    return activeChainClient;
  }

  activeChainClient = new EvmChainClient(config);
  return activeChainClient;
}

export function setChainClient(client) {
  activeChainClient = client;
}

export function resetChainClient() {
  activeChainClient = null;
}
