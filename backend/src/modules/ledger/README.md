# Ledger Module

## Overview
The **Ledger Module** provides tamper-evident blockchain anchoring of the system's audit trail.
Audit logs are fingerprinted into a deterministic binary Merkle tree with prefix-based domain separation, and the root hash along with the block hash is anchored to an append-only smart contract (`AuditAnchor.sol`).
The PostgreSQL database remains the system's primary source of truth, while the blockchain acts as an immutable, tamper-evident witness.

## Architecture & Dependency Rules
- **Layer:** Domain Services layer.
- **Allowed incoming dependencies:** Depends only on `platform`, `audit`, and `master` (for user relations).
- **Prohibited incoming dependencies:** No existing domain module (`expenses`, `budgets`, `balances`, `auth`, `audit`) may import or depend on `ledger`.
- **Public API:** Only functions, classes, and routers exported by `backend/src/modules/ledger/index.js` may be imported by other files (such as `src/app.js` and `src/server.js`).

## Public Interface
- `getStatus()`: Returns current chain status, latest block, unanchored count, and latest verification run.
- `listBlocks({ page, limit, status })`: Lists anchored blocks with pagination and optional status filter.
- `anchorPending({ userId, bypassLock, testConcurrencyDelayMs })`: Commits a batch of settled audit entries into a block, building a Merkle tree and anchoring the root on-chain. Protected by PostgreSQL transaction advisory locking.
- `retryBlock(blockId, { userId })`: Idempotently retries failed or pending blocks. Syncs from chain if already present.
- `verifyAll({ userId })`: Re-hashes every audit row linked to blocks, re-derives roots, checks hash chain continuity, and verifies against on-chain records.
- `getProof(auditEntryId)`: Computes a Merkle inclusion proof for an individual audit log entry.
- `startLedgerScheduler()` / `stopLedgerScheduler()`: Manages background periodic anchoring timer.

## Security Guarantees
- Domain separation prefixes: `0x00` (leaf), `0x01` (interior node), `0x02` (block hash).
- No personal or business data on-chain; only cryptographic hashes and counts.
- Well-known test private keys (e.g., Hardhat Account #0) are strictly forbidden on public testnets (Sepolia, Amoy).
- Zero private key leakage in logs, audit records, or HTTP responses.
