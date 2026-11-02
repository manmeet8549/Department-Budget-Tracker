# Department Budget Spending Tracker

> College budget management and spending tracking system — Release 1 (MVP) v1.5.  
> Architecture: Express (Node.js) + React (Vite) + PostgreSQL (Prisma) + Design System.

---

## Service URLs & Endpoints

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Vite + React SPA |
| **Backend API Base** | [http://localhost:5000/api/v1](http://localhost:5000/api/v1) | Express REST API |
| **Health Check** | [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health) | Liveness probe (`/health`) |
| **Swagger Documentation** | [http://localhost:5000/api/docs](http://localhost:5000/api/docs) | OpenAPI 3.0 Interactive UI |

---

## Prerequisites

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: PostgreSQL 14+ database instance (or Supabase URL)
- Separate databases for development (`DATABASE_URL`) and automated testing (`DATABASE_URL_TEST`)

---

## Clean-Start Commands (Quick Start)

To get the application up and running from a fresh clone or reset state:

### 1. Backend Setup & Start
```bash
cd backend
npm install
cp .env.example .env     # Ensure DATABASE_URL and DATABASE_URL_TEST are configured

# Apply schema migrations and seed master data:
npx prisma migrate deploy
node prisma/seed.js

# Start backend dev server:
npm run dev              # Listens on http://localhost:5000
```

### 2. Frontend Setup & Start
```bash
cd frontend
npm install

# Start frontend dev server:
npm run dev              # Accessible on http://localhost:5173
```

---

## Demo Accounts (Seed Data)

All test accounts share the password: **`Password@123`**

| Role | Email | Password | Department / Scope |
|---|---|---|---|
| **SUPER_ADMIN** | `superadmin@college.edu` | `Password@123` | College-wide (Unrestricted Admin) |
| **MANAGEMENT** | `management@college.edu` | `Password@123` | College-wide (Approver & Viewer) |
| **FINANCE** | `finance@college.edu` | `Password@123` | College-wide (Disbursement & Allocator) |
| **AUDITOR** | `auditor@college.edu` | `Password@123` | College-wide (Read-only Audit Trail) |
| **HOD (ET)** | `hod_et@college.edu` | `Password@123` | Electronics & Telecom (`ET`) |
| **HOD (PHARMA)** | `hod_pharma@college.edu` | `Password@123` | Pharmacy (`PHARMA`) |
| **HOD (HM)** | `hod_hm@college.edu` | `Password@123` | Hotel Management (`HM`) |
| **HOD (MT)** | `hod_mt@college.edu` | `Password@123` | Management & Technology (`MT`) |
| **STAFF (ET)** | `staff_et@college.edu` | `Password@123` | Electronics & Telecom (`ET`) |
| **STAFF (HM)** | `staff_hm@college.edu` | `Password@123` | Hotel Management (`HM`) |
| **STAFF (MT)** | `staff_mt@college.edu` | `Password@123` | Management & Technology (`MT`) |
| *Disabled User* | `disabled_user@college.edu` | `Password@123` | Inactive test user (Login blocked) |

### Master Data Included:
- **Active Financial Year:** `2026-27` (`OPEN`, 1 Apr 2026 – 31 Mar 2027)
- **Top-level Departments:** `ET` (Engineering), `PHARMA` (Pharmacy), `HM` (Hotel Management), `MT` (Management & Technology)
- **Sub-units under MT:** `BBA` (Bachelor of Business Administration), `BCOM` (Bachelor of Commerce)
- **Standard Expense Categories:** Equipment, Consumables, Maintenance, Events and Seminars, Books and Journals, Travel and Tours, Software, Miscellaneous

---

## 10-Step MVP Demo Script

Follow these steps to demonstrate the complete Release 1 (MVP) flow from initial login to approved budget, expense lifecycle, and live dashboard updates:

1. **Step 1 — Login as Super Admin**
   - Navigate to [http://localhost:5173](http://localhost:5173).
   - Click the **Admin** pill (or sign in with `superadmin@college.edu` / `Password@123`).
   - Confirm active financial year `2026-27` is open, and academic departments and expense categories are active.

2. **Step 2 — Inspect Empty/Initial Dashboard as HOD**
   - Sign out and log in as HOD ET (`hod_et@college.edu` / `Password@123`).
   - Landing page is the **Department Dashboard**.
   - Note the role scoping: HOD sees only their department card; the college-wide facts strip is not shown.

3. **Step 3 — Propose Annual Department Budget**
   - Navigate to **Budgets** (or **Annual Proposal** in sidebar).
   - Create a budget proposal for FY `2026-27` for Department `ET` totaling **₹ 8,00,000**:
     - *Equipment*: ₹ 5,00,000.00
     - *Consumables*: ₹ 2,00,000.00
     - *Software*: ₹ 1,00,000.00
   - Submit the proposal (`DRAFT` → `SUBMITTED`).

4. **Step 4 — Login as Management for Approval**
   - Sign out and log in as Management (`management@college.edu` / `Password@123`).
   - Landing page displays the 1.45 : 1 header split with the **ProductDiagram** dynamically showing connected departments converging on the blue central "Budget control" hub.

5. **Step 5 — Approve the Department Budget**
   - Navigate to **Budget Approvals** (`/budgets`).
   - Review ET's submitted budget of ₹ 8,00,000.00.
   - Click **Approve Budget**. Status transitions to `APPROVED`.
   - The central balance ledger is initialized with `allocated: 800000.00`, `available: 800000.00`, `committed: 0.00`, and `spent: 0.00`.

6. **Step 6 — Draft Expense Claim as Staff**
   - Sign out and log in as Staff ET (`staff_et@college.edu` / `Password@123`).
   - Navigate to **Expenses** (`/expenses`) → **Raise Request**.
   - Create a draft expense:
     - *Category*: Equipment
     - *Amount*: ₹ 1,50,000.50
     - *Purpose*: "Lab oscilloscope and test probes"
   - Status is `DRAFT`. At this stage, money is not reserved.

7. **Step 7 — Submit Expense Claim**
   - Click **Submit** on the draft expense. Status transitions to `SUBMITTED`.
   - Balance check confirms money is not committed yet (`Committed: 0.00`, `Available: 8,00,000.00`), preventing premature budget exhaustion.

8. **Step 8 — HOD Expense Approval (Money Committed)**
   - Sign out and log in as HOD ET (`hod_et@college.edu` / `Password@123`).
   - Navigate to **Expenses** → Review the submitted claim of ₹ 1,50,000.50.
   - Click **Approve**.
   - The system executes an atomic row lock: ₹ 1,50,000.50 is moved into `committed`.
   - Department Available balance drops immediately to ₹ 6,49,999.50 (`8,00,000.00 - 1,50,000.50`).

9. **Step 9 — Finance Disbursement (Money Spent)**
   - Sign out and log in as Finance (`finance@college.edu` / `Password@123`).
   - Navigate to **Payment Processing** (`/expenses`).
   - Locate the approved claim of ₹ 1,50,000.50.
   - Click **Mark Paid** and enter payment reference `UTR-2026-1025-01`.
   - Money transitions from `committed` to `spent`: `Committed: 0.00`, `Spent: 1,50,000.50`, `Available: 6,49,999.50`.

10. **Step 10 — Verify Live Dashboard**
    - Sign out and log in as Management (`management@college.edu`) or Super Admin (`superadmin@college.edu`).
    - The landing Dashboard immediately displays real-time updated figures:
      - **College Facts Strip**: Total Allocated ₹ 8,00,000, Total Spent ₹ 1,50,000.50, Total Available ₹ 6,49,999.50.
      - **Department Card (ET)**: Tabular figures with Indian currency grouping (`₹ 8,00,000`, `₹ 1,50,000.50`, `₹ 6,49,999.50`).
      - **Utilisation Progress Bar**: "18.75% used" displayed in accent blue.
      - Invariant verified: `Available + Committed + Spent == Allocated` (`6,49,999.50 + 0.00 + 1,50,000.50 == 8,00,000.00`).

---

## Automated Test Suites & Verification

### Backend Tests (Isolated Test Database)
```bash
cd backend
npm test                # Runs all 25 Jest test suites (196 tests: unit, contract, concurrency, e2e)
npm run lint            # Verifies ESLint zero errors/warnings
npx prisma migrate status # Verifies zero database schema drift

```

### Frontend Tests (Vitest + Testing Library)
```bash
cd frontend
npm test                # Runs 7 Vitest test suites (57 tests)
npm run lint            # Verifies ESLint zero errors/warnings
npm run check:colors    # Verifies zero hardcoded hex/rgba outside tokens.css
```

---

## Continuous Integration (CI) Pipeline & Local Setup

### How CI Runs Tests
GitHub Actions runs the `.github/workflows/ci.yml` pipeline on every push and pull request:
1. **PostgreSQL Service Container**: Spins up a `postgres:16` container with a health check (`pg_isready`), port forwarding `5432:5432`, and throwaway credentials (`POSTGRES_USER: test_user`, `POSTGRES_PASSWORD: test_password`, `POSTGRES_DB: budget_tracker_test`).
2. **Safety Environment Isolation**: Job-level variables configure `DATABASE_URL` (`.../budget_tracker_dev`) and `DATABASE_URL_TEST` (`.../budget_tracker_test`) to two distinct databases on the container, satisfying the safety guard in `src/config/db.js`.
3. **Execution Sequence**:
   - `actions/checkout@v4`
   - `actions/setup-node@v4` with Node 24 matching local environment and npm cache
   - `npm ci`
   - `npx prisma generate`
   - `node scripts/test-db-setup.js` (executes `prisma migrate deploy` against the test database, truncates tables, and seeds baseline data)
   - `npm run lint`
   - `npm run test:ci` (runs all 25 Jest test suites in band with `--ci --forceExit --testTimeout=30000`)
4. **Parallel Frontend Job**: Runs dependencies, ESLint, and Vitest test suites.

### How to Run the Same Setup Locally (Docker)
To replicate the CI test environment locally without using remote database providers:
```bash
# 1. Start a local PostgreSQL 16 container:
docker run -d --name budget-tracker-test-db \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=budget_tracker_test \
  -p 5432:5432 \
  postgres:16

# 2. Set environment variables (or place in backend/.env):
export NODE_ENV=test
export DATABASE_URL="postgresql://test_user:test_password@localhost:5432/budget_tracker_dev"
export DATABASE_URL_TEST="postgresql://test_user:test_password@localhost:5432/budget_tracker_test"
export JWT_SECRET="dummy_ci_jwt_secret_token_at_least_32_chars_long"

# 3. Run migrations and tests:
cd backend
npx prisma generate
node scripts/test-db-setup.js
npm run test:ci
```

---

## Blockchain Ledger & Audit Trail Anchoring (Iteration L)

The **Ledger Module** provides cryptographic, tamper-evident anchoring of the system's audit trail.
Batches of settled audit logs are deterministically canonicalized and fingerprinted into a binary Merkle tree with domain separation prefixes (`0x00` leaf, `0x01` interior node, `0x02` block hash). Only the resulting 32-byte Merkle root and block hash are anchored to an append-only Solidity smart contract (`AuditAnchor.sol`).
The PostgreSQL database remains the primary operational source of truth; the blockchain acts as an immutable witness.

### 1. Local Hardhat Chain Setup & Contract Deployment
```bash
# 1. In a dedicated terminal, launch the local Hardhat node (Chain ID: 31337):
cd contracts
npm install
npx hardhat node

# 2. In another terminal, deploy the AuditAnchor contract:
npm run deploy:local
# Output deploys AuditAnchor.sol and saves address to contracts/deployments/local.json
# and exports ABI to backend/src/modules/ledger/chain/AuditAnchor.abi.json
```

### 2. Configuration for Testnets (Sepolia & Polygon Amoy)
Configure the following in `backend/.env`:

| Environment Variable | Local Hardhat | Ethereum Sepolia | Polygon Amoy |
|---|---|---|---|
| `LEDGER_ENABLED` | `true` | `true` | `true` |
| `LEDGER_CHAIN` | `local` | `sepolia` | `amoy` |
| `LEDGER_RPC_URL` | `http://127.0.0.1:8545` | `https://rpc.sepolia.org` | `https://rpc-amoy.polygon.technology` |
| `LEDGER_CONTRACT_ADDRESS` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | `<Deployed Sepolia Address>` | `<Deployed Amoy Address>` |
| `LEDGER_SIGNER_PRIVATE_KEY` | `0xac0974bec...` (Hardhat Account #0) | `0x<Your testnet private key>` | `0x<Your testnet private key>` |
| `LEDGER_EXPECTED_CHAIN_ID` | `31337` | `11155111` | `80002` |
| `LEDGER_INTERVAL_SECONDS` | `300` (5 minutes) | `300` | `300` |
| `LEDGER_SETTLE_SECONDS` | `300` (5 minutes) | `300` | `300` |
| `LEDGER_BATCH_MAX` | `100` | `100` | `100` |

> **Security Guardrail:** The system strictly refuses the well-known Hardhat default private key (`0xac09...`) on any non-local network.

### 3. Demonstrating Tamper Detection (Exact SQL Commands)
Anyone with database access can attempt to tamper with audit records. The system's cryptographic verification (`POST /api/v1/ledger/verify` or via the **Blockchain Integrity** frontend screen) instantly detects and flags unauthorized modifications:

#### Case A — Modifying an Audit Log Row
```sql
-- Alter a sensitive business record inside the audit trail:
UPDATE audit_logs
SET action = 'HACKED_APPROVAL'
WHERE id = 1;
```
*Verification Outcome:* Integrity check reports `ok: false`, marks the affected block as `AUDIT_MODIFIED`, and identifies audit entry `#1`.

#### Case B — Deleting an Audit Log Row
```sql
-- Bypass referential integrity temporarily and delete an audit record:
SET session_replication_role = replica;
DELETE FROM audit_logs WHERE id = 1;
SET session_replication_role = DEFAULT;
```
*Verification Outcome:* Integrity check reports `ok: false`, marks block as `AUDIT_MISSING`, and reports missing audit ID `#1`.

#### Case C — Tampering with Database Merkle Root
```sql
-- Malicious DBA attempts to cover tampering by altering the stored root:
UPDATE ledger_blocks
SET merkle_root = '0x1111111111111111111111111111111111111111111111111111111111111111'
WHERE id = 1;
```
*Verification Outcome:* Integrity check reports `ok: false` with `LEDGER_TAMPERED` because the DB root no longer matches the on-chain smart contract anchor.

#### Case D — Missing On-Chain Anchor
If a block is marked `ANCHORED` in the local database but never successfully mined on-chain, verification flags `MISSING_ON_CHAIN`.

---

## Architectural Documentation

| Document | Description |
|---|---|
| [techstack.md](./techstack.md) | Highest authority on technology stack, hard rules, and conventions |
| [architecture.md](./architecture.md) | System architecture, module boundaries, iteration gates |
| [design.md](./design.md) | Visual design tokens, layout geometry, typography, and accessibility |
| [PROJECT.md](./PROJECT.md) | Complete business requirements and lifecycle specification |
