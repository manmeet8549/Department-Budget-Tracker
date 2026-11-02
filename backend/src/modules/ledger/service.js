/**
 * backend/src/modules/ledger/service.js
 * Domain service for blockchain anchoring of the audit trail.
 */

import { prisma } from '../../config/db.js';
import { log as auditLog } from '../audit/index.js';
import { AppError } from '../platform/index.js';
import { canonicalize } from './pure/canonical.js';
import {
  hashLeaf,
  buildTree,
  getRoot,
  getProof as getMerkleProof,
  computeBlockHash,
  GENESIS_PREV_BLOCK_HASH,
} from './pure/merkle.js';
import { getChainClient } from './chain/client.js';
import { getLedgerConfig } from './config.js';

/**
 * Retrieves the current status of the blockchain ledger anchoring system.
 */
export async function getStatus() {
  const chainClient = getChainClient();
  const netInfo = await chainClient.getNetworkInfo();

  const [lastBlock, lastVerification, totalAuditEntries, anchoredEntriesCount] = await Promise.all([
    prisma.ledgerBlock.findFirst({
      orderBy: { blockNo: 'desc' },
      include: {
        creator: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.ledgerVerification.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        runner: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({
      where: {
        tableName: { notIn: ['ledger_blocks', 'ledger_verifications', 'ledger_block_entries', 'LEDGER', 'ledger'] },
        action: { not: { startsWith: 'LEDGER' } },
      },
    }),
    prisma.ledgerBlockEntry.count(),
  ]);

  const unanchoredCount = Math.max(0, totalAuditEntries - anchoredEntriesCount);

  return {
    chain: netInfo.name,
    isTestnet: netInfo.isTestnet,
    contractAddress: netInfo.contractAddress,
    explorerBaseUrl: netInfo.explorerBaseUrl,
    lastBlock: lastBlock
      ? {
          id: lastBlock.id,
          blockNo: lastBlock.blockNo,
          merkleRoot: lastBlock.merkleRoot,
          blockHash: lastBlock.blockHash,
          entryCount: lastBlock.entryCount,
          status: lastBlock.status,
          txHash: lastBlock.txHash,
          anchoredAt: lastBlock.anchoredAt,
          createdAt: lastBlock.createdAt,
        }
      : null,
    unanchoredCount,
    lastVerification: lastVerification
      ? {
          id: lastVerification.id,
          ok: lastVerification.ok,
          summary: lastVerification.summary,
          createdAt: lastVerification.createdAt,
          runBy: lastVerification.runner ? lastVerification.runner.name : 'System',
        }
      : null,
  };
}

/**
 * Lists anchored ledger blocks with pagination.
 */
export async function listBlocks({ page = 1, limit = 20, status = null } = {}) {
  const where = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [total, blocks] = await Promise.all([
    prisma.ledgerBlock.count({ where }),
    prisma.ledgerBlock.findMany({
      where,
      skip,
      take: limit,
      orderBy: { blockNo: 'desc' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    blocks: blocks.map((b) => ({
      id: b.id,
      blockNo: b.blockNo,
      prevBlockHash: b.prevBlockHash,
      merkleRoot: b.merkleRoot,
      blockHash: b.blockHash,
      entryCount: b.entryCount,
      status: b.status,
      chainId: b.chainId,
      contractAddress: b.contractAddress,
      txHash: b.txHash,
      chainBlockNumber: b.chainBlockNumber ? b.chainBlockNumber.toString() : null,
      errorMessage: b.errorMessage,
      createdAt: b.createdAt,
      submittedAt: b.submittedAt,
      anchoredAt: b.anchoredAt,
      creator: b.creator,
    })),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Anchors unanchored audit entries into a new block.
 * Uses a database transaction lock to guarantee concurrency safety.
 * Submits to blockchain OUTSIDE the transaction.
 */
export async function anchorPending({
  userId = null,
  bypassLock = false,
  testConcurrencyDelayMs = 0,
} = {}) {
  const config = getLedgerConfig();
  const chainClient = getChainClient();

  if (config.chain === 'disabled' && !(chainClient.name && chainClient.name !== 'disabled')) {
    throw new AppError('LEDGER_NOT_CONFIGURED', 'Blockchain ledger is disabled or not configured', 409);
  }

  const settleSeconds = config.settleSeconds;
  const batchMax = config.batchMax;
  const settleCutoff = new Date(Date.now() - settleSeconds * 1000);

  // ── Step 1: In one transaction under a lock, create the block as PENDING ────────
  let preparedBlockData = null;

  await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL advisory transaction lock unless testing concurrency failure
    if (!bypassLock) {
      try {
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(749213);');
      } catch {
        // Fallback for non-postgres environments
      }
    }

    // Rule: Only one non-ANCHORED block may exist at a time
    const pendingOrFailed = await tx.ledgerBlock.findFirst({
      where: { status: { in: ['PENDING', 'SUBMITTED', 'FAILED'] } },
      orderBy: { blockNo: 'desc' },
    });

    if (pendingOrFailed) {
      preparedBlockData = {
        created: false,
        reason: 'EXISTING_PENDING_BLOCK',
        message: `Block #${pendingOrFailed.blockNo} is currently ${pendingOrFailed.status} and must be anchored or retried first`,
      };
      return;
    }

    // Find the last anchored block to get next blockNo and prevBlockHash
    const lastBlock = await tx.ledgerBlock.findFirst({
      orderBy: { blockNo: 'desc' },
    });

    // Find audit entries already incorporated in any block
    const anchoredAuditIds = await tx.ledgerBlockEntry.findMany({
      select: { auditEntryId: true },
    });
    const excludedAuditIds = anchoredAuditIds.map((a) => a.auditEntryId);

    // Select audit entries older than settle window, excluding LEDGER records
    const auditWhere = {
      tableName: { notIn: ['ledger_blocks', 'ledger_verifications', 'ledger_block_entries', 'LEDGER', 'ledger'] },
      action: { not: { startsWith: 'LEDGER' } },
      createdAt: { lte: settleCutoff },
    };

    if (excludedAuditIds.length > 0) {
      auditWhere.id = { notIn: excludedAuditIds };
    }

    const candidateEntries = await tx.auditLog.findMany({
      where: auditWhere,
      take: batchMax,
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    if (candidateEntries.length === 0) {
      preparedBlockData = { created: false, reason: 'NO_ENTRIES' };
      return;
    }

    // Build Merkle tree and calculate hashes
    const leaves = candidateEntries.map((e) => hashLeaf(canonicalize(e)));
    const tree = buildTree(leaves);
    const merkleRoot = getRoot(tree);

    const blockNo = lastBlock ? lastBlock.blockNo + 1 : 1;
    const prevBlockHash = lastBlock ? lastBlock.blockHash : GENESIS_PREV_BLOCK_HASH;
    const blockHash = computeBlockHash(prevBlockHash, merkleRoot, blockNo, candidateEntries.length);

    // Create block in PENDING state
    const createdBlock = await tx.ledgerBlock.create({
      data: {
        blockNo,
        prevBlockHash,
        merkleRoot,
        blockHash,
        entryCount: candidateEntries.length,
        status: 'PENDING',
        createdBy: userId ? Number(userId) : null,
      },
    });

    // Create block entries membership list
    const entryData = candidateEntries.map((entry, index) => ({
      blockId: createdBlock.id,
      position: index,
      auditEntryId: entry.id,
      leafHash: leaves[index],
    }));

    await tx.ledgerBlockEntry.createMany({
      data: entryData,
    });

    // Log manual audit action inside the same transaction
    if (userId) {
      await auditLog(tx, {
        userId,
        action: 'LEDGER_BLOCK_CREATED',
        table: 'LEDGER',
        recordId: String(createdBlock.id),
        newValue: {
          blockNo,
          merkleRoot,
          blockHash,
          entryCount: candidateEntries.length,
        },
      });
    }

    if (testConcurrencyDelayMs > 0) {
      await new Promise((r) => setTimeout(r, testConcurrencyDelayMs));
    }

    preparedBlockData = {
      created: true,
      block: createdBlock,
      blockNo,
      merkleRoot,
      prevBlockHash,
      blockHash,
      entryCount: candidateEntries.length,
    };
  });

  if (!preparedBlockData || !preparedBlockData.created) {
    return preparedBlockData || { created: false };
  }

  const { block, blockNo, merkleRoot, prevBlockHash, blockHash, entryCount } = preparedBlockData;

  // ── Step 2: Submit to chain OUTSIDE transaction (never hold DB lock during network call)
  await prisma.ledgerBlock.update({
    where: { id: block.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  try {
    const chainRes = await chainClient.anchor(blockNo, merkleRoot, prevBlockHash, blockHash, entryCount);
    const netInfo = await chainClient.getNetworkInfo();

    const anchoredBlock = await prisma.ledgerBlock.update({
      where: { id: block.id },
      data: {
        status: 'ANCHORED',
        txHash: chainRes.txHash,
        chainBlockNumber: chainRes.chainBlockNumber ? BigInt(chainRes.chainBlockNumber) : null,
        chainId: netInfo.chainId,
        contractAddress: netInfo.contractAddress,
        anchoredAt: chainRes.anchoredAt || new Date(),
        errorMessage: null,
      },
    });

    return {
      created: true,
      block: {
        ...anchoredBlock,
        chainBlockNumber: anchoredBlock.chainBlockNumber ? anchoredBlock.chainBlockNumber.toString() : null,
      },
    };
  } catch (err) {
    const safeError = err.message
      ? err.message.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED_KEY]')
      : 'Blockchain anchor execution failed';

    const failedBlock = await prisma.ledgerBlock.update({
      where: { id: block.id },
      data: {
        status: 'FAILED',
        errorMessage: safeError,
      },
    });

    return {
      created: false,
      error: safeError,
      block: failedBlock,
    };
  }
}

/**
 * Idempotently retries an unanchored / failed block.
 */
export async function retryBlock(blockId, { userId = null } = {}) {
  const chainClient = getChainClient();

  const block = await prisma.ledgerBlock.findUnique({
    where: { id: Number(blockId) },
  });

  if (!block) {
    throw new AppError('BLOCK_NOT_FOUND', `Ledger block with id ${blockId} not found`, 404);
  }

  if (block.status === 'ANCHORED') {
    return { retried: true, block, message: 'Block is already anchored' };
  }

  // Idempotent check: ask the chain if this block_no was already anchored
  const onChain = await chainClient.getAnchor(block.blockNo);
  if (onChain && onChain.merkleRoot.toLowerCase() === block.merkleRoot.toLowerCase()) {
    // Block was already anchored on-chain! Just update local DB without anchoring twice.
    const netInfo = await chainClient.getNetworkInfo();
    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.ledgerBlock.update({
        where: { id: block.id },
        data: {
          status: 'ANCHORED',
          txHash: onChain.txHash || block.txHash || '0x_on_chain_synced',
          chainBlockNumber: onChain.chainBlockNumber ? BigInt(onChain.chainBlockNumber) : block.chainBlockNumber,
          chainId: netInfo.chainId,
          contractAddress: netInfo.contractAddress,
          anchoredAt: onChain.anchoredAt || new Date(),
          errorMessage: null,
        },
      });

      if (userId) {
        await auditLog(tx, {
          userId,
          action: 'LEDGER_BLOCK_RETRIED',
          table: 'LEDGER',
          recordId: String(block.id),
          newValue: { blockNo: block.blockNo, status: 'ANCHORED', note: 'Synced from existing chain anchor' },
        });
      }
      return b;
    });

    return {
      retried: true,
      block: {
        ...updated,
        chainBlockNumber: updated.chainBlockNumber ? updated.chainBlockNumber.toString() : null,
      },
    };
  }

  // Not on-chain yet: execute anchor
  await prisma.ledgerBlock.update({
    where: { id: block.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  try {
    const chainRes = await chainClient.anchor(
      block.blockNo,
      block.merkleRoot,
      block.prevBlockHash,
      block.blockHash,
      block.entryCount
    );
    const netInfo = await chainClient.getNetworkInfo();

    const anchored = await prisma.$transaction(async (tx) => {
      const b = await tx.ledgerBlock.update({
        where: { id: block.id },
        data: {
          status: 'ANCHORED',
          txHash: chainRes.txHash,
          chainBlockNumber: chainRes.chainBlockNumber ? BigInt(chainRes.chainBlockNumber) : null,
          chainId: netInfo.chainId,
          contractAddress: netInfo.contractAddress,
          anchoredAt: chainRes.anchoredAt || new Date(),
          errorMessage: null,
        },
      });

      if (userId) {
        await auditLog(tx, {
          userId,
          action: 'LEDGER_BLOCK_RETRIED',
          table: 'LEDGER',
          recordId: String(block.id),
          newValue: { blockNo: block.blockNo, status: 'ANCHORED', txHash: chainRes.txHash },
        });
      }
      return b;
    });

    return {
      retried: true,
      block: {
        ...anchored,
        chainBlockNumber: anchored.chainBlockNumber ? anchored.chainBlockNumber.toString() : null,
      },
    };
  } catch (err) {
    const safeError = err.message
      ? err.message.replace(/0x[a-fA-F0-9]{64}/g, '[REDACTED_KEY]')
      : 'Retry failed';

    await prisma.ledgerBlock.update({
      where: { id: block.id },
      data: { status: 'FAILED', errorMessage: safeError },
    });

    throw new AppError('RETRY_FAILED', safeError, 500);
  }
}

/**
 * Verifies integrity of all anchored blocks against current database rows and the blockchain.
 */
export async function verifyAll({ userId = null } = {}) {
  const chainClient = getChainClient();

  const blocks = await prisma.ledgerBlock.findMany({
    orderBy: { blockNo: 'asc' },
    include: {
      entries: {
        orderBy: { position: 'asc' },
      },
    },
  });

  let overallOk = true;
  const blockResults = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockAuditIds = block.entries.map((e) => e.auditEntryId);

    // Fetch current audit rows from database
    const currentAuditRows = await prisma.auditLog.findMany({
      where: { id: { in: blockAuditIds } },
    });
    const currentAuditMap = new Map(currentAuditRows.map((r) => [r.id, r]));

    const missingIds = [];
    const modifiedIds = [];
    const recomputedLeaves = [];

    for (const entry of block.entries) {
      const currentRow = currentAuditMap.get(entry.auditEntryId);
      if (!currentRow) {
        missingIds.push(entry.auditEntryId);
      } else {
        const currentLeaf = hashLeaf(canonicalize(currentRow));
        if (currentLeaf.toLowerCase() !== entry.leafHash.toLowerCase()) {
          modifiedIds.push(entry.auditEntryId);
        }
        recomputedLeaves.push(currentLeaf);
      }
    }

    let status = 'OK';
    const issues = [];

    if (missingIds.length > 0) {
      status = 'AUDIT_MISSING';
      issues.push(`Missing audit entries: ${missingIds.join(', ')}`);
      overallOk = false;
    } else if (modifiedIds.length > 0) {
      status = 'AUDIT_MODIFIED';
      issues.push(`Modified audit entries: ${modifiedIds.join(', ')}`);
      overallOk = false;
    } else {
      // Recompute Merkle root from leaves
      const tree = buildTree(recomputedLeaves);
      const recomputedRoot = getRoot(tree);

      if (recomputedRoot.toLowerCase() !== block.merkleRoot.toLowerCase()) {
        status = 'AUDIT_MODIFIED';
        issues.push('Database Merkle root does not match recomputed tree from audit rows');
        overallOk = false;
      }
    }

    // Compare with on-chain anchor
    if (block.status === 'ANCHORED') {
      const onChain = await chainClient.getAnchor(block.blockNo);
      if (!onChain) {
        status = 'MISSING_ON_CHAIN';
        issues.push(`Block #${block.blockNo} marked ANCHORED in database but not found on-chain`);
        overallOk = false;
      } else if (onChain.merkleRoot.toLowerCase() !== block.merkleRoot.toLowerCase()) {
        status = 'LEDGER_TAMPERED';
        issues.push(
          `On-chain root (${onChain.merkleRoot.slice(0, 10)}...) differs from DB root (${block.merkleRoot.slice(0, 10)}...)`
        );
        overallOk = false;
      }
    } else {
      if (status === 'OK') {
        status = 'NOT_ANCHORED_YET';
      }
    }

    // Verify hash chain continuity
    const expectedPrev = i === 0 ? GENESIS_PREV_BLOCK_HASH : blocks[i - 1].blockHash;
    if (block.prevBlockHash.toLowerCase() !== expectedPrev.toLowerCase()) {
      status = 'LEDGER_TAMPERED';
      issues.push(`Invalid prevBlockHash link in block #${block.blockNo}`);
      overallOk = false;
    }

    const recomputedBlockHash = computeBlockHash(
      block.prevBlockHash,
      block.merkleRoot,
      block.blockNo,
      block.entryCount
    );
    if (recomputedBlockHash.toLowerCase() !== block.blockHash.toLowerCase()) {
      status = 'LEDGER_TAMPERED';
      issues.push(`Recomputed block hash does not match stored block hash in block #${block.blockNo}`);
      overallOk = false;
    }

    blockResults.push({
      blockId: block.id,
      blockNo: block.blockNo,
      status,
      entryCount: block.entryCount,
      merkleRoot: block.merkleRoot,
      txHash: block.txHash,
      missingIds,
      modifiedIds,
      issues,
    });
  }

  // Count entries not yet anchored
  const [totalAuditEntries, anchoredCount] = await Promise.all([
    prisma.auditLog.count({
      where: {
        tableName: { notIn: ['ledger_blocks', 'ledger_verifications', 'ledger_block_entries', 'LEDGER', 'ledger'] },
        action: { not: { startsWith: 'LEDGER' } },
      },
    }),
    prisma.ledgerBlockEntry.count(),
  ]);

  const unanchoredCount = Math.max(0, totalAuditEntries - anchoredCount);

  // Record verification run in ledger_verifications
  const verification = await prisma.ledgerVerification.create({
    data: {
      runBy: userId ? Number(userId) : null,
      ok: overallOk,
      summary: {
        blocks: blockResults,
        unanchoredCount,
        verifiedAt: new Date().toISOString(),
      },
    },
  });

  // Log manual verification audit action
  if (userId) {
    await auditLog(null, {
      userId,
      action: 'LEDGER_VERIFIED',
      table: 'LEDGER',
      recordId: String(verification.id),
      newValue: {
        ok: overallOk,
        blockCount: blocks.length,
        unanchoredCount,
      },
    });
  }

  return {
    verificationId: verification.id,
    ok: overallOk,
    summary: {
      blocks: blockResults,
      unanchoredCount,
      verifiedAt: verification.createdAt,
    },
  };
}

/**
 * Returns inclusion proof for an individual audit entry.
 */
export async function getProof(auditEntryId) {
  const numId = Number(auditEntryId);
  if (isNaN(numId)) {
    throw new AppError('INVALID_AUDIT_ID', 'Audit entry ID must be a valid number', 400);
  }

  const blockEntry = await prisma.ledgerBlockEntry.findUnique({
    where: { auditEntryId: numId },
    include: {
      block: {
        include: {
          entries: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (!blockEntry || !blockEntry.block || blockEntry.block.status !== 'ANCHORED') {
    throw new AppError('NOT_ANCHORED_YET', `Audit entry #${numId} is not yet anchored in an on-chain block`, 409);
  }

  const block = blockEntry.block;
  const leaves = block.entries.map((e) => e.leafHash);
  const tree = buildTree(leaves);
  const proof = getMerkleProof(tree, blockEntry.position);

  return {
    auditEntryId: numId,
    leafHash: blockEntry.leafHash,
    position: blockEntry.position,
    proof,
    merkleRoot: block.merkleRoot,
    blockNo: block.blockNo,
    txHash: block.txHash,
  };
}
