const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AuditAnchor Smart Contract', () => {
  let AuditAnchor;
  let anchor;
  let owner;
  let nonOwner;
  let newOwner;

  const zeroBytes32 = ethers.ZeroHash;
  const dummyRoot1 = '0x1111111111111111111111111111111111111111111111111111111111111111';
  const dummyBlockHash1 = '0x2222222222222222222222222222222222222222222222222222222222222222';
  const dummyRoot2 = '0x3333333333333333333333333333333333333333333333333333333333333333';
  const dummyBlockHash2 = '0x4444444444444444444444444444444444444444444444444444444444444444';

  beforeEach(async () => {
    [owner, nonOwner, newOwner] = await ethers.getSigners();
    AuditAnchor = await ethers.getContractFactory('AuditAnchor');
    anchor = await AuditAnchor.deploy();
    await anchor.waitForDeployment();
  });

  describe('Initial State', () => {
    it('initializes with anchorCount 0 and owner set to deployer', async () => {
      expect(await anchor.anchorCount()).to.equal(0n);
      expect(await anchor.owner()).to.equal(owner.address);
      expect(await anchor.lastBlockHash()).to.equal(zeroBytes32);
    });
  });

  describe('Access Control', () => {
    it('only owner can anchor; non-owner call reverts', async () => {
      await expect(
        anchor.connect(nonOwner).anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 10)
      ).to.be.revertedWithCustomError(anchor, 'OwnableUnauthorizedAccount')
        .withArgs(nonOwner.address);
    });
  });

  describe('Block Sequencing and Chaining Invariants', () => {
    it('skipping block number reverts with InvalidBlockNumber', async () => {
      // Trying to anchor block 2 when anchorCount is 0
      await expect(
        anchor.anchor(2n, dummyRoot1, zeroBytes32, dummyBlockHash1, 5)
      ).to.be.revertedWithCustomError(anchor, 'InvalidBlockNumber')
        .withArgs(1n, 2n);
    });

    it('repeating a block number reverts with InvalidBlockNumber', async () => {
      await anchor.anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 5);
      expect(await anchor.anchorCount()).to.equal(1n);

      // Attempting block 1 again
      await expect(
        anchor.anchor(1n, dummyRoot2, dummyBlockHash1, dummyBlockHash2, 5)
      ).to.be.revertedWithCustomError(anchor, 'InvalidBlockNumber')
        .withArgs(2n, 1n);
    });

    it('first block with non-zero prevBlockHash reverts with InvalidPrevBlockHash', async () => {
      const nonZeroPrev = '0x9999999999999999999999999999999999999999999999999999999999999999';
      await expect(
        anchor.anchor(1n, dummyRoot1, nonZeroPrev, dummyBlockHash1, 5)
      ).to.be.revertedWithCustomError(anchor, 'InvalidPrevBlockHash')
        .withArgs(zeroBytes32, nonZeroPrev);
    });

    it('subsequent block with mismatched prevBlockHash reverts with InvalidPrevBlockHash', async () => {
      await anchor.anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 5);

      const wrongPrev = '0x8888888888888888888888888888888888888888888888888888888888888888';
      await expect(
        anchor.anchor(2n, dummyRoot2, wrongPrev, dummyBlockHash2, 8)
      ).to.be.revertedWithCustomError(anchor, 'InvalidPrevBlockHash')
        .withArgs(dummyBlockHash1, wrongPrev);
    });
  });

  describe('Events and Retrieval', () => {
    it('emits Anchored event with exact parameters', async () => {
      await expect(anchor.anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 15))
        .to.emit(anchor, 'Anchored')
        .withArgs(1n, dummyRoot1, dummyBlockHash1, 15);
    });

    it('stores and retrieves anchor records via getAnchor() and anchorCount()', async () => {
      const tx = await anchor.anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 15);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      expect(await anchor.anchorCount()).to.equal(1n);
      expect(await anchor.lastBlockHash()).to.equal(dummyBlockHash1);

      const record = await anchor.getAnchor(1n);
      expect(record[0]).to.equal(1n); // blockNo
      expect(record[1]).to.equal(dummyRoot1); // merkleRoot
      expect(record[2]).to.equal(zeroBytes32); // prevBlockHash
      expect(record[3]).to.equal(dummyBlockHash1); // blockHash
      expect(record[4]).to.equal(15); // entryCount
      expect(record[5]).to.equal(BigInt(block.timestamp)); // anchoredAt

      // Anchor block 2
      await anchor.anchor(2n, dummyRoot2, dummyBlockHash1, dummyBlockHash2, 25);
      expect(await anchor.anchorCount()).to.equal(2n);
      expect(await anchor.lastBlockHash()).to.equal(dummyBlockHash2);

      const record2 = await anchor.getAnchor(2n);
      expect(record2[0]).to.equal(2n);
      expect(record2[1]).to.equal(dummyRoot2);
      expect(record2[2]).to.equal(dummyBlockHash1);
      expect(record2[3]).to.equal(dummyBlockHash2);
      expect(record2[4]).to.equal(25);
    });

    it('getAnchor reverts for invalid block numbers', async () => {
      await expect(anchor.getAnchor(0n)).to.be.revertedWithCustomError(anchor, 'AnchorNotFound').withArgs(0n);
      await expect(anchor.getAnchor(999n)).to.be.revertedWithCustomError(anchor, 'AnchorNotFound').withArgs(999n);
    });
  });

  describe('Ownership Transfer', () => {
    it('only owner can transfer ownership', async () => {
      await expect(
        anchor.connect(nonOwner).transferOwnership(newOwner.address)
      ).to.be.revertedWithCustomError(anchor, 'OwnableUnauthorizedAccount')
        .withArgs(nonOwner.address);

      await anchor.transferOwnership(newOwner.address);
      expect(await anchor.owner()).to.equal(newOwner.address);

      // Previous owner can no longer anchor
      await expect(
        anchor.anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 5)
      ).to.be.revertedWithCustomError(anchor, 'OwnableUnauthorizedAccount')
        .withArgs(owner.address);

      // New owner can anchor
      await expect(
        anchor.connect(newOwner).anchor(1n, dummyRoot1, zeroBytes32, dummyBlockHash1, 5)
      ).to.emit(anchor, 'Anchored');
    });
  });

  describe('Immutability and ABI Verification', () => {
    it('the ABI has NO function that updates or deletes an anchor', () => {
      const functionFragments = anchor.interface.fragments.filter((f) => f.type === "function");
      const fragmentNames = functionFragments.map((f) => f.name).filter(Boolean);

      const forbiddenKeywords = ['update', 'delete', 'remove', 'modify', 'edit', 'destroy', 'setAnchor'];
      for (const name of fragmentNames) {
        for (const kw of forbiddenKeywords) {
          expect(name.toLowerCase()).to.not.include(kw, `ABI contains forbidden mutating function: ${name}`);
        }
      }

      // Explicitly check permitted non-standard functions
      const customFunctions = fragmentNames.filter((name) =>
        !['owner', 'renounceOwnership', 'transferOwnership'].includes(name)
      );
      expect(customFunctions).to.have.members(['anchor', 'anchorCount', 'lastBlockHash', 'getAnchor']);
    });
  });
});
