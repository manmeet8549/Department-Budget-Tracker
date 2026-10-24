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

## Seed Accounts & Test Passwords (Iteration 1)

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

> **Note on Departments:** Minimal placeholder departments (`ET`, `PHARMA`, `HM`, `MT`) are seeded in Iteration 1 solely to support department scoping for HOD and STAFF roles. The complete department structure (including parent-child relationships for sub-units like BBA/BCOM under MT) and administrative CRUD will be implemented in the `master` module in Iteration 2.

---

## 1. Local Development (Without Docker)

### Prerequisites
- Node.js >= 20
- PostgreSQL database (or Supabase URL configured in `backend/.env`)

### Setup & Run

1. **Configure Environment:**
   ```bash
   cp backend/.env.example backend/.env
   # Add your PostgreSQL / Supabase connection strings and secrets
   ```

2. **Backend:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev       # Starts Express API on http://localhost:5000
   ```

3. **Frontend:**
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
```bash
cd backend
npm test             # Run Jest unit & API tests
npm run test:ci      # Run Jest tests with CI flag & forceExit
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

```bash
cd backend
npx prisma db push        # Push schema changes to database
npx prisma migrate dev    # Create and apply migrations
npx prisma db seed        # Run database seed script
```

---

## Documents

| File | Purpose |
|---|---|
| [techstack.md](./techstack.md) | Stack, hard rules, API conventions — highest authority |
| [architecture.md](./architecture.md) | Module layers, iteration plan, testing gates |
| [design.md](./design.md) | Frontend visual style and design tokens |
| [PROJECT.md](./PROJECT.md) | Full product requirements and feature specification |
