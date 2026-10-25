# Department Budget Spending Tracker

> College budget management system — React + Node.js + PostgreSQL (Supabase) + Redis

---

## Service URLs & Endpoints

| Service | URL | Notes |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Vite + React SPA |
| **Backend API Base** | [http://localhost:5000/api/v1](http://localhost:5000/api/v1) | Express REST API |
| **Health Check** | [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health) | Liveness probe |
| **Swagger Documentation** | [http://localhost:5000/api/docs](http://localhost:5000/api/docs) | OpenAPI 3.0 Interactive UI |

---

## Seed Accounts & Master Data (Iteration 2)

All seeded test accounts share the password: **`Password@123`**

| Role | Email | Password | Department Scope |
|---|---|---|---|
| **SUPER_ADMIN** | `superadmin@college.edu` | `Password@123` | College-wide (Unrestricted) |
| **MANAGEMENT** | `management@college.edu` | `Password@123` | College-wide (Unrestricted) |
| **FINANCE** | `finance@college.edu` | `Password@123` | College-wide (Unrestricted) |
| **HOD** | `hod_et@college.edu` | `Password@123` | Engineering Block (`ET`) |
| **HOD** | `hod_pharma@college.edu` | `Password@123` | Pharmacy Block (`PHARMA`) |
| **STAFF** | `staff_et@college.edu` | `Password@123` | Engineering Block (`ET`) |
| **AUDITOR** | `auditor@college.edu` | `Password@123` | College-wide (Read-only) |
| *Disabled User* | `disabled_user@college.edu` | `Password@123` | Inactive (Cannot log in) |

### Seeded Master Data:
- **Active Financial Year:** `2026-27` (1 April 2026 to 31 March 2027, status: `OPEN`)
- **Departments:** `ET` (Engineering), `PHARMA` (Pharmacy), `HM` (Hotel Management), `MT` (Management & Technology)
- **Sub-units under MT:** `BBA` (Bachelor of Business Administration), `BCOM` (Bachelor of Commerce)
- **Categories:** Equipment, Consumables, Maintenance, Events and Seminars, Books and Journals, Travel and Tours, Software, Miscellaneous

---

## 1. Local Development (Without Docker)

### Prerequisites
- Node.js >= 20
- PostgreSQL database (or Supabase URL configured in `backend/.env`)

### Setup & Run

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   # Add your PostgreSQL connection strings (DATABASE_URL and DATABASE_URL_TEST)
   ```

2. **Database Migration & Seeding:**
   > **Important:** Always use proper Prisma migrations (`prisma migrate deploy`). Do NOT use `prisma db push`.
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy   # Applies versioned migrations under prisma/migrations
   node prisma/seed.js         # Seeds master data (FY 2026-27, departments, categories, users)
   ```

3. **Backend:**
   ```bash
   cd backend
   npm run dev       # Starts Express API on http://localhost:5000
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev       # Starts Vite Dev Server on http://localhost:5173
   ```

---

## 2. Docker Quick Start

```bash
cp backend/.env.example .env     # Fill in secrets for Docker Compose
docker compose up -d             # Starts api, web, postgres, redis
docker compose ps                # Check container statuses
docker compose down              # Stop all containers
```

---

## 3. Running Tests & Quality Checks

### Backend:
> **Test Database Isolation:** Tests automatically connect to `DATABASE_URL_TEST` (configured in `.env`) and never touch the development database. Running `npm test` automatically runs `scripts/test-db-setup.js` to migrate, reset, and reseed the test database before running tests.

```bash
cd backend
npm test             # Migrates/resets test DB and runs Jest test suites
npm run test:ci      # CI runner (uses CI service container or DATABASE_URL_TEST)
npm run db:test:setup # Manually reset and reseed the test database
npm run lint         # Run ESLint on src and tests
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Run Prettier code formatting
```

### Frontend:
```bash
cd frontend
npm test             # Run Vitest test runner
npm run test:watch   # Run tests in interactive watch mode
npm run lint         # Run ESLint on JSX/JS files
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Run Prettier code formatting
```

---

## 4. Database & Migrations

> **Important:** Stop using `prisma db push`. All schema changes must use version-controlled Prisma migrations under `prisma/migrations`.

```bash
cd backend
npx prisma migrate deploy    # Apply pending migrations to database
npx prisma migrate dev       # Create a new migration during local schema changes
node prisma/seed.js          # Seed master data into database
npm run db:test:setup        # Reset and reseed the isolated test database
```

---

## Documents

| File | Purpose |
|---|---|
| [techstack.md](./techstack.md) | Stack, hard rules, API conventions — highest authority |
| [architecture.md](./architecture.md) | Module layers, iteration plan, testing gates |
| [design.md](./design.md) | Frontend visual style and design tokens |
| [PROJECT.md](./PROJECT.md) | Full product requirements and feature specification |
