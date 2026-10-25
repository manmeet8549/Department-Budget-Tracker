# Budget Tracker Backend
 
Express REST API with Prisma ORM, PostgreSQL, and structured modules (`platform`, `auth`, `audit`, `master`).
 
---
 
## Database Migrations & Seeding
 
We use Prisma Migrations for schema evolution and baseline tracking under `prisma/migrations`.
 
> **Important Rule:** Do NOT use `npx prisma db push`. Always use version-controlled migrations.
 
### Development Workflow
 
1. **Apply existing migrations to local/dev database:**
   ```bash
   npx prisma migrate deploy
   ```
2. **Seed baseline data (users, FY 2026-27, departments, categories):**
   ```bash
   node prisma/seed.js
   ```
3. **Generate Prisma Client after schema changes:**
   ```bash
   npx prisma generate
   ```
4. **Create a new migration during development:**
   ```bash
   npx prisma migrate dev --name <migration_name>
   ```
 
---
 
## Test Database Isolation
 
Tests must NEVER run against the development database.
 
- In `backend/.env`, define both `DATABASE_URL` and `DATABASE_URL_TEST`:
  ```env
  DATABASE_URL="postgresql://user:password@host:5432/dbname"
  DIRECT_URL="postgresql://user:password@host:5432/dbname"
  DATABASE_URL_TEST="postgresql://user:password@host:5432/dbname_test"
  DIRECT_URL_TEST="postgresql://user:password@host:5432/dbname_test"
  ```
- When running `npm test`, the test setup script (`scripts/test-db-setup.js`) automatically:
  1. Deploys migrations to `DATABASE_URL_TEST`.
  2. Resets tables cleanly via `TRUNCATE ... RESTART IDENTITY CASCADE`.
  3. Reseeds the baseline test fixtures (`seed.js`).
  4. Runs Jest with `NODE_ENV=test`, pointing `prisma` exclusively to `DATABASE_URL_TEST`.
 
### Run Commands
 
```bash
npm test              # Automatically prepares test DB and executes Jest
npm run db:test:setup # Manually reset and reseed the test database
npm run lint          # Run ESLint on src and tests
npm run lint:fix      # Auto-fix linting issues
```
