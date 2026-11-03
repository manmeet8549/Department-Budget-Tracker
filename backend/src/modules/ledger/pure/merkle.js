/**
 * backend/src/modules/ledger/pure/merkle.js
 * Pure cryptographic functions for Merkle tree generation, proof verification,
 * and block hash chaining.
 *
 * Rules:
 * - Domain separation:
 *     leaf       = sha256(0x00 || canonical bytes)
 *     node       = sha256(0x01 || left || right)
 *     block hash = sha256(0x02 || prevBlockHash || merkleRoot || uint64be(blockNo) || uint32be(entryCount))
 * - An odd node is promoted unchanged (never duplicated).
 * - Genesis prevBlockHash = 32 zero bytes.
 * - All hashes are 0x-prefixed lowercase hex strings.
 */

import crypto from 'crypto';

export const GENESIS_PREV_BLOCK_HASH = '0x' + '00'.repeat(32);

/**
 * Normalizes a hex string to 0x-prefixed lowercase.
 */
export function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new Error('Hash must be a string');
  }
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  return '0x' + clean.toLowerCase();
}

/**
 * Computes leaf hash: sha256(0x00 || canonical bytes).
 * @param {Buffer|string} canonicalBytes
 * @returns {string} 0x-prefixed lowercase hex
 */
export function hashLeaf(canonicalBytes) {
  const buf = Buffer.isBuffer(canonicalBytes) ? canonicalBytes : Buffer.from(canonicalBytes, 'utf8');
  const prefix = Buffer.from([0x00]);
  const digest = crypto.createHash('sha256').update(Buffer.concat([prefix, buf])).digest('hex');
  return '0x' + digest.toLowerCase();
}

/**
 * Computes internal node hash: sha256(0x01 || left || right).
 * @param {string} left 0x-prefixed hex (32 bytes)
 * @param {string} right 0x-prefixed hex (32 bytes)
 * @returns {string} 0x-prefixed lowercase hex
 */
export function hashNode(left, right) {
  const prefix = Buffer.from([0x01]);
  const leftBuf = Buffer.from(left.replace(/^0x/i, ''), 'hex');
  const rightBuf = Buffer.from(right.replace(/^0x/i, ''), 'hex');

  if (leftBuf.length !== 32 || rightBuf.length !== 32) {
    throw new Error('Internal node hashes must be exactly 32 bytes');
  }

  const digest = crypto.createHash('sha256').update(Buffer.concat([prefix, leftBuf, rightBuf])).digest('hex');
  return '0x' + digest.toLowerCase();
}

/**
 * Builds a Merkle tree from an array of leaf hashes.
 * Odd nodes are promoted unchanged without duplication.
 * @param {string[]} leaves Array of 0x-prefixed leaf hashes
 * @returns {object} Tree structure containing levels and root
 */
export function buildTree(leaves) {
  if (!Array.isArray(leaves)) {
    throw new Error('Leaves must be an array');
  }

  if (leaves.length === 0) {
    return {
      levels: [[]],
      root: GENESIS_PREV_BLOCK_HASH,
    };
  }

  // Normalize all leaves
  const normalizedLeaves = leaves.map((l) => normalizeHex(l));
  const levels = [normalizedLeaves];

  let currentLevel = normalizedLeaves;
  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashNode(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Odd node promoted unchanged (never duplicated)
        nextLevel.push(currentLevel[i]);
      }
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    levels,
    root: currentLevel[0],
  };
}

/**
 * Returns the Merkle root of a built tree.
 * @param {object} tree
 * @returns {string} 0x-prefixed lowercase hex
 */
export function getRoot(tree) {
  if (!tree || !tree.root) {
    throw new Error('Invalid tree object');
  }
  return tree.root;
}

/**
 * Generates an inclusion proof path for a leaf at the given index.
 * @param {object} tree Built Merkle tree
 * @param {number} leafIndex Index of the leaf
 * @returns {Array<{position: 'left'|'right', hash: string}>} Proof steps
 */
export function getProof(tree, leafIndex) {
  if (!tree || !Array.isArray(tree.levels) || tree.levels.length === 0) {
    throw new Error('Invalid tree object');
  }

  const leaves = tree.levels[0];
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`Leaf index ${leafIndex} out of bounds (0..${leaves.length - 1})`);
  }

  const proof = [];
  let index = leafIndex;

  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex++) {
    const level = tree.levels[levelIndex];
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex < level.length) {
      proof.push({
        position: isRightNode ? 'left' : 'right',
        hash: level[siblingIndex],
      });
    }
    // If no sibling (odd node promoted), no step is added for this level.

    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Cryptographically verifies a Merkle proof against a root.
 * Works strictly with only leaf, proof path, and root (can be audited manually).
 * @param {string} leaf 0x-prefixed leaf hash
 * @param {Array<{position: 'left'|'right', hash: string}>} proof
 * @param {string} root Expected 0x-prefixed Merkle root
 * @returns {boolean} True if the proof matches the root
 */
export function verifyProof(leaf, proof, root) {
  if (!leaf || !root || !Array.isArray(proof)) {
    return false;
  }

  let current = normalizeHex(leaf);
  const targetRoot = normalizeHex(root);

  for (const step of proof) {
    if (!step || !step.hash || !['left', 'right'].includes(step.position)) {
      return false;
    }
    const sibling = normalizeHex(step.hash);
    if (step.position === 'left') {
      current = hashNode(sibling, current);
    } else {
      current = hashNode(current, sibling);
    }
  }

  return current === targetRoot;
}

/**
 * Computes chained block hash:
 * sha256(0x02 || prevBlockHash || merkleRoot || uint64be(blockNo) || uint32be(entryCount))
 * @param {string} prevBlockHash 0x-prefixed hex (32 bytes)
 * @param {string} merkleRoot 0x-prefixed hex (32 bytes)
 * @param {number|bigint} blockNo Sequential block number
 * @param {number} entryCount Number of entries fingerprinted in this block
 * @returns {string} 0x-prefixed lowercase hex (32 bytes)
 */
export function computeBlockHash(prevBlockHash, merkleRoot, blockNo, entryCount) {
  const prefix = Buffer.from([0x02]);
  const prevBuf = Buffer.from(normalizeHex(prevBlockHash).replace(/^0x/, ''), 'hex');
  const rootBuf = Buffer.from(normalizeHex(merkleRoot).replace(/^0x/, ''), 'hex');

  if (prevBuf.length !== 32) {
    throw new Error('prevBlockHash must be exactly 32 bytes');
  }
  if (rootBuf.length !== 32) {
    throw new Error('merkleRoot must be exactly 32 bytes');
  }

  const blockNoBuf = Buffer.alloc(8);
  blockNoBuf.writeBigUInt64BE(BigInt(blockNo));

  const countBuf = Buffer.alloc(4);
  countBuf.writeUInt32BE(Number(entryCount));

  const data = Buffer.concat([prefix, prevBuf, rootBuf, blockNoBuf, countBuf]);
  const digest = crypto.createHash('sha256').update(data).digest('hex');
  return '0x' + digest.toLowerCase();
}

