// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuditAnchor
 * @notice Append-only audit trail anchor contract.
 * Records Merkle roots of audit trail batches along with hash chain integrity.
 * No anchor record can ever be updated or deleted. No upgradeable proxy.
 */
contract AuditAnchor is Ownable {
    struct AnchorRecord {
        uint256 blockNo;
        bytes32 merkleRoot;
        bytes32 prevBlockHash;
        bytes32 blockHash;
        uint32 entryCount;
        uint256 anchoredAt;
    }

    uint256 public anchorCount;
    bytes32 public lastBlockHash;
    mapping(uint256 => AnchorRecord) private _anchors;

    event Anchored(
        uint256 indexed blockNo,
        bytes32 indexed merkleRoot,
        bytes32 blockHash,
        uint32 entryCount
    );

    error InvalidBlockNumber(uint256 expected, uint256 provided);
    error InvalidPrevBlockHash(bytes32 expected, bytes32 provided);
    error AnchorNotFound(uint256 blockNo);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Anchors a new audit batch. Can only be invoked by the contract owner.
     * @param blockNo Sequential block number (must strictly equal anchorCount + 1).
     * @param merkleRoot 32-byte Merkle tree root of the audit batch.
     * @param prevBlockHash Hash of previous block (must match last stored blockHash, or bytes32(0) for block 1).
     * @param blockHash Chained SHA-256 hash of this block.
     * @param entryCount Count of audit log entries fingerprinted in this block.
     */
    function anchor(
        uint256 blockNo,
        bytes32 merkleRoot,
        bytes32 prevBlockHash,
        bytes32 blockHash,
        uint32 entryCount
    ) external onlyOwner {
        if (blockNo != anchorCount + 1) {
            revert InvalidBlockNumber(anchorCount + 1, blockNo);
        }

        if (anchorCount == 0) {
            if (prevBlockHash != bytes32(0)) {
                revert InvalidPrevBlockHash(bytes32(0), prevBlockHash);
            }
        } else {
            if (prevBlockHash != lastBlockHash) {
                revert InvalidPrevBlockHash(lastBlockHash, prevBlockHash);
            }
        }

        _anchors[blockNo] = AnchorRecord({
            blockNo: blockNo,
            merkleRoot: merkleRoot,
            prevBlockHash: prevBlockHash,
            blockHash: blockHash,
            entryCount: entryCount,
            anchoredAt: block.timestamp
        });

        anchorCount = blockNo;
        lastBlockHash = blockHash;

        emit Anchored(blockNo, merkleRoot, blockHash, entryCount);
    }

    /**
     * @notice Retrieves the stored anchor record for a given block number.
     * @param blockNo The block number to query (1 to anchorCount).
     */
    function getAnchor(uint256 blockNo)
        external
        view
        returns (
            uint256,
            bytes32,
            bytes32,
            bytes32,
            uint32,
            uint256
        )
    {
        if (blockNo == 0 || blockNo > anchorCount) {
            revert AnchorNotFound(blockNo);
        }
        AnchorRecord memory a = _anchors[blockNo];
        return (
            a.blockNo,
            a.merkleRoot,
            a.prevBlockHash,
            a.blockHash,
            a.entryCount,
            a.anchoredAt
        );
    }
}

