/**
 * backend/tests/ledger_pure.test.js
 * Comprehensive unit tests for Ledger pure functions:
 * canonical JSON serialization, Merkle tree, proof verification, and block hash chaining.
 */

import { canonicalize, toCanonicalEntry } from '../src/modules/ledger/pure/canonical.js';
import {
  hashLeaf,
  hashNode,
  buildTree,
  getRoot,
  getProof,
  verifyProof,
  computeBlockHash,
  GENESIS_PREV_BLOCK_HASH,
} from '../src/modules/ledger/pure/merkle.js';

describe('Iteration L: Ledger Pure Cryptographic Functions', () => {
  describe('Canonical JSON Serialization (canonical.js)', () => {
    it('canonical output is identical for different key orders (top-level and nested)', () => {
      const entryA = {
        id: 101,
        entityType: 'EXPENSE',
        entityId: 'EXP-555',
        action: 'EXPENSE_APPROVED',
        actorId: 42,
        oldValues: {
          status: 'SUBMITTED',
          remark: null,
          details: { z: 26, a: 1, m: 13 },
        },
        newValues: {
          status: 'APPROVED',
          amount: '150000.50',
          approverId: 42,
          meta: { tag: 'urgent', approved: true },
        },
        createdAt: '2026-10-25T14:30:00.000Z',
      };

      // Same data with completely scrambled key order, extra metadata to exclude
      const entryB = {
        createdAt: new Date('2026-10-25T14:30:00.000Z'),
        action: 'EXPENSE_APPROVED',
        newValues: {
          meta: { approved: true, tag: 'urgent' },
          approverId: 42,
          amount: '150000.50',
          status: 'APPROVED',
        },
        actorId: 42,
        id: 101,
        oldValues: {
          details: { a: 1, m: 13, z: 26 },
          remark: null,
          status: 'SUBMITTED',
        },
        entityId: 'EXP-555',
        entityType: 'EXPENSE',
        // Non-audited request metadata that must be ignored
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome',
      };

      const canonA = canonicalize(entryA);
      const canonB = canonicalize(entryB);

      expect(canonA).toBe(canonB);

      // Verify exact keys present in canonical object
      const parsed = JSON.parse(canonA);
      expect(Object.keys(parsed)).toEqual([
        'action',
        'actorId',
        'createdAt',
        'entityId',
        'entityType',
        'id',
        'newValues',
        'oldValues',
      ]);
      expect(parsed).not.toHaveProperty('ipAddress');
      expect(parsed).not.toHaveProperty('userAgent');
    });

    it('formats UTC ISO timestamps and money/decimals as strings', () => {
      const entry = {
        id: 1,
        tableName: 'budgets',
        recordId: '10',
        action: 'BUDGET_APPROVED',
        userId: 2,
        oldValue: { total: 0 },
        newValue: {
          totalAmount: {
            toFixed: () => '800000.00',
            toNumber: () => 800000,
            toString: () => '800000.00',
          },
        },
        createdAt: new Date('2026-04-01T09:15:30.123Z'),
      };

      const canon = toCanonicalEntry(entry);
      expect(canon.createdAt).toBe('2026-04-01T09:15:30.123Z');
      expect(canon.entityType).toBe('budgets');
      expect(canon.entityId).toBe('10');
      expect(canon.actorId).toBe(2);
      expect(canon.newValues.totalAmount).toBe('800000.00');
    });

    it('handles null values cleanly without undefined', () => {
      const entry = {
        id: 5,
        entityType: 'settings',
        entityId: 'OVER_BUDGET_POLICY',
        action: 'SETTING_UPDATED',
        actorId: null,
        oldValues: null,
        newValues: { value: 'BLOCK', note: undefined },
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      const json = canonicalize(entry);
      expect(json).not.toContain('undefined');
      const parsed = JSON.parse(json);
      expect(parsed.actorId).toBeNull();
      expect(parsed.oldValues).toBeNull();
      expect(parsed.newValues).not.toHaveProperty('note');
    });
  });

  describe('Merkle Tree Cryptographic Invariants (merkle.js)', () => {
    // Generate deterministic sample leaves
    const l1 = hashLeaf(canonicalize({ id: 1, entityType: 'A', entityId: '1', action: 'CREATE', actorId: 1, oldValues: null, newValues: {}, createdAt: '2026-01-01T00:00:00.000Z' }));
    const l2 = hashLeaf(canonicalize({ id: 2, entityType: 'A', entityId: '2', action: 'CREATE', actorId: 1, oldValues: null, newValues: {}, createdAt: '2026-01-01T00:00:00.000Z' }));
    const l3 = hashLeaf(canonicalize({ id: 3, entityType: 'A', entityId: '3', action: 'CREATE', actorId: 1, oldValues: null, newValues: {}, createdAt: '2026-01-01T00:00:00.000Z' }));
    const l4 = hashLeaf(canonicalize({ id: 4, entityType: 'A', entityId: '4', action: 'CREATE', actorId: 1, oldValues: null, newValues: {}, createdAt: '2026-01-01T00:00:00.000Z' }));
    const l5 = hashLeaf(canonicalize({ id: 5, entityType: 'A', entityId: '5', action: 'CREATE', actorId: 1, oldValues: null, newValues: {}, createdAt: '2026-01-01T00:00:00.000Z' }));

    it('leaf cannot be passed off as an internal node (0x00 vs 0x01 domain separation)', () => {
      const data = 'identical-data-payload';
      const leafH = hashLeaf(data);

      // Attempt to hash 32-byte dummy buffers using hashNode
      const dummyLeft = '0x' + '00'.repeat(32);
      const dummyRight = '0x' + '00'.repeat(32);
      const nodeH = hashNode(dummyLeft, dummyRight);

      // Different prefixes guarantee separation
      expect(leafH).not.toBe(nodeH);
      expect(leafH.startsWith('0x')).toBe(true);
      expect(nodeH.startsWith('0x')).toBe(true);
    });

    it('computes exact Merkle roots for 1, 2, 3, 4, and 5 leaves (promoting odd nodes)', () => {
      // 1 leaf: root is the leaf itself
      const tree1 = buildTree([l1]);
      expect(getRoot(tree1)).toBe(l1);

      // 2 leaves: root = hashNode(l1, l2)
      const tree2 = buildTree([l1, l2]);
      const expectedRoot2 = hashNode(l1, l2);
      expect(getRoot(tree2)).toBe(expectedRoot2);

      // 3 leaves: level 0 = [l1, l2, l3]
      // level 1 = [hashNode(l1, l2), l3] (l3 promoted unchanged)
      // root = hashNode(hashNode(l1, l2), l3)
      const tree3 = buildTree([l1, l2, l3]);
      const h12 = hashNode(l1, l2);
      const expectedRoot3 = hashNode(h12, l3);
      expect(getRoot(tree3)).toBe(expectedRoot3);

      // 4 leaves: level 0 = [l1, l2, l3, l4]
      // level 1 = [h12, hashNode(l3, l4)]
      // root = hashNode(h12, hashNode(l3, l4))
      const tree4 = buildTree([l1, l2, l3, l4]);
      const h34 = hashNode(l3, l4);
      const expectedRoot4 = hashNode(h12, h34);
      expect(getRoot(tree4)).toBe(expectedRoot4);

      // 5 leaves: level 0 = [l1, l2, l3, l4, l5]
      // level 1 = [h12, h34, l5] (l5 promoted unchanged)
      // level 2 = [h(h12, h34), l5] (l5 promoted unchanged again)
      // root = hashNode(h(h12, h34), l5)
      const tree5 = buildTree([l1, l2, l3, l4, l5]);
      const h1234 = hashNode(h12, h34);
      const expectedRoot5 = hashNode(h1234, l5);
      expect(getRoot(tree5)).toBe(expectedRoot5);
    });

    it('changing any leaf or leaf order changes the root', () => {
      const treeA = buildTree([l1, l2, l3, l4, l5]);
      const rootA = getRoot(treeA);

      // Swapping order of leaves
      const treeSwapped = buildTree([l2, l1, l3, l4, l5]);
      expect(getRoot(treeSwapped)).not.toBe(rootA);

      // Modifying one leaf
      const tamperedL1 = hashLeaf('tampered-payload-1');
      const treeModified = buildTree([tamperedL1, l2, l3, l4, l5]);
      expect(getRoot(treeModified)).not.toBe(rootA);
    });

    it('valid proof verifies and tampered proof fails (tested on 1..5 leaves)', () => {
      const leaves = [l1, l2, l3, l4, l5];
      const tree = buildTree(leaves);
      const root = getRoot(tree);

      // Verify every leaf has a valid proof that verifies against root
      for (let i = 0; i < leaves.length; i++) {
        const proof = getProof(tree, i);
        expect(verifyProof(leaves[i], proof, root)).toBe(true);

        // Tampering with the leaf fails
        const fakeLeaf = hashLeaf(`fake-leaf-${i}`);
        expect(verifyProof(fakeLeaf, proof, root)).toBe(false);

        // Tampering with root fails
        expect(verifyProof(leaves[i], proof, GENESIS_PREV_BLOCK_HASH)).toBe(false);

        // Tampering with proof steps fails (if proof has steps)
        if (proof.length > 0) {
          const tamperedProof = JSON.parse(JSON.stringify(proof));
          tamperedProof[0].hash = '0x' + 'aa'.repeat(32);
          expect(verifyProof(leaves[i], tamperedProof, root)).toBe(false);
        }
      }
    });
  });

  describe('Block Hash Chaining (computeBlockHash)', () => {
    const dummyRoot1 = '0x' + '11'.repeat(32);
    const dummyRoot2 = '0x' + '22'.repeat(32);

    it('computes deterministic chained block hashes', () => {
      // Genesis block 1
      const blockHash1 = computeBlockHash(GENESIS_PREV_BLOCK_HASH, dummyRoot1, 1, 100);
      expect(blockHash1.startsWith('0x')).toBe(true);
      expect(blockHash1.length).toBe(66);

      // Block 2 chains to block 1
      const blockHash2 = computeBlockHash(blockHash1, dummyRoot2, 2, 250);
      expect(blockHash2.startsWith('0x')).toBe(true);
      expect(blockHash2).not.toBe(blockHash1);

      // Changing blockNo changes hash
      const blockHash2DiffNo = computeBlockHash(blockHash1, dummyRoot2, 3, 250);
      expect(blockHash2DiffNo).not.toBe(blockHash2);

      // Changing entryCount changes hash
      const blockHash2DiffCount = computeBlockHash(blockHash1, dummyRoot2, 2, 251);
      expect(blockHash2DiffCount).not.toBe(blockHash2);

      // Changing prevBlockHash breaks chain
      const fakePrev = '0x' + '99'.repeat(32);
      const blockHash2Broken = computeBlockHash(fakePrev, dummyRoot2, 2, 250);
      expect(blockHash2Broken).not.toBe(blockHash2);
    });
  });
});

