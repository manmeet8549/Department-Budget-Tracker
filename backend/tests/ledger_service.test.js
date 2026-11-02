/* eslint-disable no-console */
import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import {
  anchorPending,
  retryBlock,
  verifyAll,
  getProof,
  setChainClient,
  resetChainClient,
  FakeChainClient,
  validateLedgerConfig,
  verifyProof,
} from '../src/modules/ledger/index.js';

describe('Iteration L: Blockchain Ledger Service & API', () => {
  jest.setTimeout(45000);

  let app;
  let superAdminToken;
  let managementToken;
  let auditorToken;
  let financeToken;
  let hodEtToken;
  let staffEtToken;
  let superAdminUser;

  let fakeChain;

  const login = async (email) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password@123' });
    return res.body.data.accessToken;
  };

  beforeAll(async () => {
    app = createApp();

    superAdminToken = await login('superadmin@college.edu');
    managementToken = await login('management@college.edu');
    auditorToken = await login('auditor@college.edu');
    financeToken = await login('finance@college.edu');
    hodEtToken = await login('hod_et@college.edu');
    staffEtToken = await login('staff_et@college.edu');

    superAdminUser = await prisma.user.findUnique({ where: { email: 'superadmin@college.edu' } });
  });

  beforeEach(async () => {
    // Setup fresh FakeChainClient for predictable test state
    fakeChain = new FakeChainClient();
    setChainClient(fakeChain);

    // Clean ledger and audit tables
    await prisma.ledgerVerification.deleteMany({});
    await prisma.ledgerBlockEntry.deleteMany({});
    await prisma.ledgerBlock.deleteMany({});
    await prisma.auditLog.deleteMany({});
  });

  afterAll(async () => {
    resetChainClient();
  });

  describe('Settle Window and Batch Filtering', () => {
    it('does not anchor audit entries created within settle window, only older entries', async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

      // Create an older settled entry
      const oldEntry = await prisma.auditLog.create({
        data: {
          action: 'BUDGET_CREATED',
          tableName: 'budgets',
          recordId: '101',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      // Create a recent un-settled entry (within 5-min default settle window)
      await prisma.auditLog.create({
        data: {
          action: 'BUDGET_UPDATED',
          tableName: 'budgets',
          recordId: '101',
          userId: superAdminUser.id,
          createdAt: oneMinuteAgo,
        },
      });

      const res = await anchorPending({ userId: superAdminUser.id });
      expect(res.created).toBe(true);
      expect(res.block.entryCount).toBe(1);

      const blockEntries = await prisma.ledgerBlockEntry.findMany({
        where: { blockId: res.block.id },
      });
      expect(blockEntries.length).toBe(1);
      expect(blockEntries[0].auditEntryId).toBe(oldEntry.id);
    });

    it('excludes LEDGER entityType and LEDGER_* actions from anchoring to prevent recursive loop', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // System audit log created by ledger itself
      await prisma.auditLog.create({
        data: {
          action: 'LEDGER_BLOCK_CREATED',
          tableName: 'LEDGER',
          recordId: '1',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      // Regular business audit log
      const businessEntry = await prisma.auditLog.create({
        data: {
          action: 'EXPENSE_SUBMITTED',
          tableName: 'expenses',
          recordId: '202',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      const res = await anchorPending({ userId: superAdminUser.id });
      expect(res.created).toBe(true);
      expect(res.block.entryCount).toBe(1);

      const blockEntries = await prisma.ledgerBlockEntry.findMany({
        where: { blockId: res.block.id },
      });
      expect(blockEntries[0].auditEntryId).toBe(businessEntry.id);
    });

    it('returns created: false with NO_ENTRIES when no candidate audit rows are eligible', async () => {
      const res = await anchorPending({ userId: superAdminUser.id });
      expect(res.created).toBe(false);
      expect(res.reason).toBe('NO_ENTRIES');
    });
  });

  describe('Full Anchoring Flow & Blockchain Transitions', () => {
    it('executes full state flow: PENDING -> SUBMITTED -> ANCHORED with valid chain receipts', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      for (let i = 1; i <= 3; i++) {
        await prisma.auditLog.create({
          data: {
            action: `TEST_ACTION_${i}`,
            tableName: 'expenses',
            recordId: String(i),
            userId: superAdminUser.id,
            createdAt: tenMinutesAgo,
          },
        });
      }

      const res = await anchorPending({ userId: superAdminUser.id });
      expect(res.created).toBe(true);
      expect(res.block.status).toBe('ANCHORED');
      expect(res.block.blockNo).toBe(1);
      expect(res.block.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(res.block.contractAddress).toBe(fakeChain.contractAddress);
      expect(res.block.entryCount).toBe(3);

      // Verify on fake chain
      const onChain = await fakeChain.getAnchor(1);
      expect(onChain).not.toBeNull();
      expect(onChain.merkleRoot.toLowerCase()).toBe(res.block.merkleRoot.toLowerCase());
      expect(onChain.blockHash.toLowerCase()).toBe(res.block.blockHash.toLowerCase());
    });

    it('handles chain failure by setting FAILED status and blocking subsequent anchor until retried', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.auditLog.create({
        data: {
          action: 'FAIL_TEST_ACTION',
          tableName: 'expenses',
          recordId: '99',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      fakeChain.setFailNext(true);

      const res = await anchorPending({ userId: superAdminUser.id });
      expect(res.created).toBe(false);
      expect(res.error).toBe('Simulated chain failure');
      expect(res.block.status).toBe('FAILED');

      // Subsequent anchorPending must refuse to create block while a block is FAILED
      const nextAttempt = await anchorPending({ userId: superAdminUser.id });
      expect(nextAttempt.created).toBe(false);
      expect(nextAttempt.reason).toBe('EXISTING_PENDING_BLOCK');
    });

    it('retryBlock is idempotent: syncs if already on chain or submits to chain if missing', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.auditLog.create({
        data: {
          action: 'RETRY_TEST_ACTION',
          tableName: 'expenses',
          recordId: '100',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      // Fail first attempt
      fakeChain.setFailNext(true);
      const initial = await anchorPending({ userId: superAdminUser.id });
      expect(initial.block.status).toBe('FAILED');

      // Now retry: fakeChain works
      const retryRes = await retryBlock(initial.block.id, { userId: superAdminUser.id });
      expect(retryRes.retried).toBe(true);
      expect(retryRes.block.status).toBe('ANCHORED');

      // Calling retry on already anchored block succeeds idempotently
      const repeatRetry = await retryBlock(initial.block.id, { userId: superAdminUser.id });
      expect(repeatRetry.retried).toBe(true);
      expect(repeatRetry.message).toBe('Block is already anchored');
    });
  });

  describe('Advisory Lock Concurrency Mutation Verification', () => {
    it('mutation check: with lock bypassed (bypassLock: true), concurrent calls race and fail or attempt duplicate block', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const mutationRuns = [];

      for (let run = 1; run <= 5; run++) {
        // Clean ledger blocks for each run
        await prisma.ledgerBlockEntry.deleteMany({});
        await prisma.ledgerBlock.deleteMany({});
        await prisma.auditLog.deleteMany({});
        fakeChain.clear();

        await prisma.auditLog.create({
          data: {
            action: `RACE_ACTION_${run}`,
            tableName: 'budgets',
            recordId: String(run),
            userId: superAdminUser.id,
            createdAt: tenMinutesAgo,
          },
        });

        // Launch 2 calls concurrently with bypassLock and simulated delay
        const [res1, res2] = await Promise.allSettled([
          anchorPending({ userId: superAdminUser.id, bypassLock: true, testConcurrencyDelayMs: 120 }),
          anchorPending({ userId: superAdminUser.id, bypassLock: true, testConcurrencyDelayMs: 120 }),
        ]);

        const hasRaceFailure =
          res1.status === 'rejected' ||
          res2.status === 'rejected' ||
          (res1.value && res1.value.reason === 'EXISTING_PENDING_BLOCK') ||
          (res2.value && res2.value.reason === 'EXISTING_PENDING_BLOCK') ||
          (res1.value?.created && res2.value?.created);

        mutationRuns.push({ run, res1Status: res1.status, res2Status: res2.status, hasRaceFailure });
      }

      console.log('MUTATION CHECK CONCURRENCY RESULTS (bypassLock: true, 5 runs):', JSON.stringify(mutationRuns));
      expect(mutationRuns.length).toBe(5);
      // All 5 runs must observe the race condition
      expect(mutationRuns.every((r) => r.hasRaceFailure)).toBe(true);
    });

    it('production check: with PostgreSQL advisory lock enabled, 10 concurrent runs produce 0 race failures and exactly 1 block per run', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const concurrencyRuns = [];

      for (let run = 1; run <= 10; run++) {
        await prisma.ledgerBlockEntry.deleteMany({});
        await prisma.ledgerBlock.deleteMany({});
        await prisma.auditLog.deleteMany({});
        fakeChain.clear();

        await prisma.auditLog.create({
          data: {
            action: `SAFE_ACTION_${run}`,
            tableName: 'budgets',
            recordId: String(run),
            userId: superAdminUser.id,
            createdAt: tenMinutesAgo,
          },
        });

        const [res1, res2] = await Promise.allSettled([
          anchorPending({ userId: superAdminUser.id, bypassLock: false, testConcurrencyDelayMs: 20 }),
          anchorPending({ userId: superAdminUser.id, bypassLock: false, testConcurrencyDelayMs: 20 }),
        ]);

        const blocksInDb = await prisma.ledgerBlock.findMany();
        expect(blocksInDb.length).toBe(1);

        const successes = [res1, res2].filter((r) => r.status === 'fulfilled' && r.value?.created === true);
        expect(successes.length).toBe(1);

        concurrencyRuns.push({ run, blocksCount: blocksInDb.length, successesCount: successes.length });
      }

      console.log('CONCURRENCY LOCK PRODUCTION RESULTS (bypassLock: false, 10 runs):', JSON.stringify(concurrencyRuns));
      expect(concurrencyRuns.length).toBe(10);
      expect(concurrencyRuns.every((r) => r.blocksCount === 1 && r.successesCount === 1)).toBe(true);
    });
  });

  describe('Tamper Detection (verifyAll)', () => {
    let anchoredBlock;
    let auditEntry1;
    let auditEntry2;

    beforeEach(async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      auditEntry1 = await prisma.auditLog.create({
        data: {
          action: 'CREATE_EXPENSE',
          tableName: 'expenses',
          recordId: '501',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      auditEntry2 = await prisma.auditLog.create({
        data: {
          action: 'APPROVE_EXPENSE',
          tableName: 'expenses',
          recordId: '501',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      const res = await anchorPending({ userId: superAdminUser.id });
      anchoredBlock = res.block;
    });

    it('verifies clean block and reports ok: true', async () => {
      const verifyRes = await verifyAll({ userId: superAdminUser.id });
      expect(verifyRes.ok).toBe(true);
      expect(verifyRes.summary.blocks[0].status).toBe('OK');
      expect(verifyRes.summary.blocks[0].issues.length).toBe(0);

      // Check record in ledger_verifications
      const dbVerification = await prisma.ledgerVerification.findUnique({
        where: { id: verifyRes.verificationId },
      });
      expect(dbVerification).not.toBeNull();
      expect(dbVerification.ok).toBe(true);
    });

    it('detects modified audit row via raw SQL and flags AUDIT_MODIFIED', async () => {
      await prisma.$executeRawUnsafe(
        `UPDATE audit_logs SET action = 'HACKED_ACTION' WHERE id = ${auditEntry1.id}`
      );

      const verifyRes = await verifyAll({ userId: superAdminUser.id });
      expect(verifyRes.ok).toBe(false);
      const b0 = verifyRes.summary.blocks[0];
      expect(b0.status).toBe('AUDIT_MODIFIED');
      expect(b0.modifiedIds).toContain(auditEntry1.id);
    });

    it('detects deleted audit row via raw SQL and flags AUDIT_MISSING', async () => {
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE id = ${auditEntry2.id};`);
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');

      const verifyRes = await verifyAll({ userId: superAdminUser.id });
      expect(verifyRes.ok).toBe(false);
      const b0 = verifyRes.summary.blocks[0];
      expect(b0.status).toBe('AUDIT_MISSING');
      expect(b0.missingIds).toContain(auditEntry2.id);
    });

    it('detects tampered database Merkle root and flags LEDGER_TAMPERED', async () => {
      await prisma.$executeRawUnsafe(
        `UPDATE ledger_blocks SET merkle_root = '0x1111111111111111111111111111111111111111111111111111111111111111' WHERE id = ${anchoredBlock.id}`
      );

      const verifyRes = await verifyAll({ userId: superAdminUser.id });
      expect(verifyRes.ok).toBe(false);
      const b0 = verifyRes.summary.blocks[0];
      expect(b0.status).toBe('LEDGER_TAMPERED');
    });

    it('detects missing on-chain anchor and flags MISSING_ON_CHAIN', async () => {
      fakeChain.clear(); // Remove anchor from chain

      const verifyRes = await verifyAll({ userId: superAdminUser.id });
      expect(verifyRes.ok).toBe(false);
      const b0 = verifyRes.summary.blocks[0];
      expect(b0.status).toBe('MISSING_ON_CHAIN');
    });
  });

  describe('Merkle Inclusion Proof (getProof)', () => {
    it('returns verifiable inclusion proof for anchored audit entry', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const entries = [];
      for (let i = 1; i <= 4; i++) {
        const e = await prisma.auditLog.create({
          data: {
            action: `PROOF_TEST_${i}`,
            tableName: 'budgets',
            recordId: String(i),
            userId: superAdminUser.id,
            createdAt: tenMinutesAgo,
          },
        });
        entries.push(e);
      }

      await anchorPending({ userId: superAdminUser.id });

      // Test proof for entry #2
      const target = entries[1];
      const proofRes = await getProof(target.id);
      expect(proofRes.auditEntryId).toBe(target.id);
      expect(proofRes.blockNo).toBe(1);
      expect(proofRes.proof).toBeInstanceOf(Array);

      const isValid = verifyProof(proofRes.leafHash, proofRes.proof, proofRes.merkleRoot);
      expect(isValid).toBe(true);
    });

    it('throws 409 NOT_ANCHORED_YET if audit entry is not yet anchored in any block', async () => {
      const unanchored = await prisma.auditLog.create({
        data: {
          action: 'NOT_YET_ANCHORED',
          tableName: 'budgets',
          recordId: '777',
          userId: superAdminUser.id,
        },
      });

      await expect(getProof(unanchored.id)).rejects.toMatchObject({
        code: 'NOT_ANCHORED_YET',
        status: 409,
      });
    });
  });

  describe('Security and Config Invariants', () => {
    it('refuses well-known Hardhat private key on non-local chain', () => {
      const hardhatDefaultKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      expect(() => {
        validateLedgerConfig({
          enabled: true,
          chain: 'sepolia',
          privateKey: hardhatDefaultKey,
          rpcUrl: 'https://rpc.sepolia.org',
          contractAddress: '0x1234567890123456789012345678901234567890',
        });
      }).toThrow(/well-known Hardhat default private key/i);
    });

    it('requires 0x prefix and 64 hex characters for private key', () => {
      expect(() => {
        validateLedgerConfig({
          enabled: true,
          chain: 'sepolia',
          privateKey: 'invalid-key',
          rpcUrl: 'https://rpc.sepolia.org',
          contractAddress: '0x1234567890123456789012345678901234567890',
        });
      }).toThrow(/LEDGER_PRIVATE_KEY must be a 32-byte hex string/i);
    });
  });

  describe('HTTP API Endpoints & Role Matrix', () => {
    it('allows SUPER_ADMIN, MANAGEMENT, and AUDITOR to access GET /api/v1/ledger/status', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
      expect(resAdmin.body.data.chain).toBeDefined();

      const resMgmt = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${managementToken}`);
      expect(resMgmt.status).toBe(200);

      const resAuditor = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${auditorToken}`);
      expect(resAuditor.status).toBe(200);
    });

    it('forbids FINANCE, HOD, and STAFF with 403 on GET /api/v1/ledger/status', async () => {
      const resFinance = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${financeToken}`);
      expect(resFinance.status).toBe(403);

      const resHod = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${hodEtToken}`);
      expect(resHod.status).toBe(403);

      const resStaff = await request(app)
        .get('/api/v1/ledger/status')
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(resStaff.status).toBe(403);
    });

    it('returns 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/ledger/status');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/ledger/anchor anchors pending entries and writes audit log', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.auditLog.create({
        data: {
          action: 'PAYMENT_PROCESSED',
          tableName: 'expenses',
          recordId: '808',
          userId: superAdminUser.id,
          createdAt: tenMinutesAgo,
        },
      });

      const res = await request(app)
        .post('/api/v1/ledger/anchor')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBe(true);

      // Verify audit log entry was written
      const ledgerAudit = await prisma.auditLog.findFirst({
        where: { action: 'LEDGER_BLOCK_CREATED' },
      });
      expect(ledgerAudit).not.toBeNull();
      expect(ledgerAudit.userId).toBe(superAdminUser.id);
    });

    it('POST /api/v1/ledger/verify performs verification and records audit log', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/verify')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ok).toBe(true);

      const verifyAudit = await prisma.auditLog.findFirst({
        where: { action: 'LEDGER_VERIFIED' },
      });
      expect(verifyAudit).not.toBeNull();
    });

    it('GET /api/v1/ledger/blocks returns paginated blocks', async () => {
      const res = await request(app)
        .get('/api/v1/ledger/blocks?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
    });
  });
});
