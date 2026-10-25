# TECHSTACK.md: Department Budget Spending Tracker

Instructions for AI coding agents. Read this file fully before writing any code. Follow it exactly. If something here conflicts with a user request, ask the user before deviating.

---

## 1. Project summary

A web application for a college that:
1. Sets an annual budget per department, split by expense category.
2. Records every expense against that budget with approvals and bills.
3. Blocks or escalates spending that exceeds the available balance.
4. Shows live budget vs. actual on dashboards and exports reports.

**Departments (seed data, but never hard-code them in logic):**

| Code | Name | Notes |
| --- | --- | --- |
| ET | Engineering Block | |
| PHARMA | Pharmacy Block | |
| HM | Hotel Management Block | |
| MT | MT Block | Has sub-units BBA and BCOM (rows in `departments` with `parent_id` = MT) |

Departments are data. A new department must be addable from the admin screen with zero code change.

**Roles:** `SUPER_ADMIN`, `MANAGEMENT`, `FINANCE`, `HOD`, `STAFF`, `AUDITOR`.

---

## 2. Fixed technology stack (do not substitute)

| Layer | Technology |
| --- | --- |
| Frontend | React.js (Vite), React Router, TanStack Query, React Hook Form + Zod, Axios, Recharts, Material UI (or Tailwind CSS; pick one at project start and keep it) |
| Backend | Node.js (current LTS), Express.js |
| API style | RESTful JSON API, base path `/api/v1` |
| Auth | JWT access token + refresh token (httpOnly cookie), bcrypt password hashing |
| Database | PostgreSQL (source of truth) |
| ORM / migrations | Prisma |
| Cache / queue | Redis via `ioredis`; background jobs via BullMQ |
| Scheduling | node-cron |
| Validation | Zod (backend and frontend share the same schema style) |
| File upload | Multer (PDF, JPG, PNG only) |
| Reports | ExcelJS (xlsx), PDFKit (pdf) |
| Email | Nodemailer |
| Security | Helmet, cors, express-rate-limit |
| Logging | Pino (+ pino-http) |
| API docs | Swagger / OpenAPI (`swagger-ui-express`) |
| Testing | Jest, Supertest, React Testing Library |
| Quality | ESLint, Prettier, Husky |
| DevOps | Git, GitHub Actions, Docker, Docker Compose, Nginx, PM2 |

Language: JavaScript (ES modules) unless the user asks for TypeScript. Do not mix the two.

---

## 3. Repository layout

```text
budget-tracker/
  backend/
    src/
      config/            db.js, redis.js, env.js
      middleware/        auth.js, role.js, department.js, validate.js, error.js
      modules/
        auth/            routes.js, controller.js, service.js, schema.js
        users/
        master/          financial years, departments, categories, vendors, settings
        budgets/         proposals, approval flow, revisions/transfers
        expenses/        requests, approvals, payment, bills
        balances/        CONTROL ENGINE (only place that calculates balances)
        dashboard/
        reports/
        notifications/
        audit/
      jobs/              report.worker.js, email.worker.js, cron.js
      utils/             money.js, dates.js, logger.js, errors.js
      app.js
      server.js
    prisma/              schema.prisma, migrations/, seed.js
    tests/               <module>.test.js per module
  frontend/
    src/
      api/               axios client + one file per module
      features/          auth, budgets, expenses, dashboard, reports, admin
      components/        tables, forms, charts, layout, alerts
      hooks/             useAuth, useBalances, usePermissions
      routes/            ProtectedRoute by role
      utils/             currency.js (Indian grouping), dates.js
  docker-compose.yml     services: api, web, postgres, redis
  .env.example
  techstack.md
```

Each backend module is self-contained: `routes.js` (paths + middleware) → `controller.js` (HTTP only) → `service.js` (business rules, DB calls) → `schema.js` (Zod). Controllers never contain business logic. Services never touch `req` or `res`.

---

## 4. Architecture rules (hard rules)

1. **Single source of truth for balances.** Only `modules/balances/service.js` calculates Allocated, Committed, Spent, Available, Utilisation. Dashboard, reports, alerts and expense checks must call it. Never recompute totals elsewhere.
2. **Balances are derived, never stored as typed-in numbers.** Compute from `budget_items` and `expenses` (SQL `SUM`).
3. **Money:** store as `NUMERIC(14,2)`. In JavaScript handle as integer paise or via a decimal library. Never use floating-point arithmetic on money.
4. **Transactions:** a status change, its balance effect and its audit log entry run in one `prisma.$transaction`. If any part fails, all roll back.
5. **Concurrency:** the expense submit/approve check-and-commit runs inside a transaction using a row lock (`SELECT ... FOR UPDATE` via `$queryRaw`) on the category's budget item. The Redis lock is an optimisation only. The database guarantees correctness.
6. **Soft delete only.** Add `is_active` or `deleted_at`. Never hard-delete business records. `audit_logs` is insert-only.
7. **Validate twice.** Frontend validates for UX. Backend validates every body, query and param with Zod. Never trust the client.
8. **Redis is a helper.** All reads must work if Redis is down (fall back to PostgreSQL). Never store the only copy of business data in Redis.
9. **Dependencies flow one way:** modules 3 and 4 write data → module 5 reads and calculates → modules 6 and 7 read module 5 → module 8 listens to all. Modules 6 and 7 must not write business data.
10. **Role and department checks are middleware**, applied on every route. Never rely on the frontend hiding a button.

---

## 5. Roles and permissions

| Role | Scope | Can do |
| --- | --- | --- |
| SUPER_ADMIN | All | Manage users, departments, categories, settings |
| MANAGEMENT | All | Approve annual budgets, high-value expenses, over-budget cases, inter-department transfers; view everything |
| FINANCE | All | Review/consolidate budgets, verify bills, mark paid, close year, generate reports |
| HOD | Own department only | Propose budget, raise and approve expenses within limit, request revisions |
| STAFF | Own department only | Raise expense requests |
| AUDITOR | All, read-only | View records, bills, audit log. No write endpoints |

`department` middleware: for `HOD` and `STAFF`, force-filter every query by `user.departmentId` and reject access to other departments with `403`.

A requester must never approve their own request. No one approves above their approval limit.

---

## 6. Domain model (Prisma tables)

All tables carry `id`, `created_at`, `updated_at`, `created_by`.

| Table | Key fields |
| --- | --- |
| `users` | name, email (unique), password_hash, role, department_id (nullable), is_active |
| `departments` | code (unique), name, parent_id (nullable, for BBA/BCOM under MT), hod_user_id, is_active |
| `financial_years` | label (e.g. `2026-27`), start_date, end_date, status (`OPEN`, `CLOSED`); only one active |
| `categories` | name (unique), is_active |
| `vendors` | name, contact, gst_no (optional), is_active |
| `budgets` | fy_id, department_id, total_amount, status, approved_by, approved_on; unique (fy_id, department_id) |
| `budget_items` | budget_id, category_id, amount, justification; unique (budget_id, category_id) |
| `budget_revisions` | budget_item_id, type (`INCREASE`, `TRANSFER`), from_item_id, to_item_id, old_amount, new_amount, reason, status |
| `expenses` | fy_id, department_id, category_id, vendor_id, amount, purpose, status, bill_file, paid_on, payment_mode, payment_ref |
| `approvals` | entity_type, entity_id, step_no, approver_id, decision, remark, decided_on |
| `audit_logs` | user_id, action, table_name, record_id, old_value (json), new_value (json), timestamp |
| `approval_limits` | role, max_amount |
| `settings` | key, value (thresholds, over-budget policy) |
| `notifications` | user_id, type, message, is_read, link |

**Statuses**
- Budget: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → LOCKED`, or `REJECTED` (returns to HoD).
- Expense: `DRAFT → SUBMITTED → APPROVED → PAID`, or `REJECTED`, `CANCELLED`.

Index: `expenses(department_id, fy_id, category_id, status, created_at)`, `audit_logs(table_name, record_id)`, `approvals(entity_type, entity_id)`.

---

## 7. Balance formulas (implement exactly)

```text
Available     = Allocated - Committed - Spent
Utilisation % = (Committed + Spent) / Allocated * 100
```

- **Committed** = sum of `expenses.amount` where status = `APPROVED` (approved, not yet paid).
- **Spent** = sum of `expenses.amount` where status = `PAID`.
- **Allocated** = `budget_items.amount` (plus approved revisions) for the category; department Allocated = `budgets.total_amount`.

Threshold status (values from `settings`, defaults shown): `NORMAL` < 70, `WARNING` ≥ 70, `CRITICAL` ≥ 90, `EXCEEDED` > 100.

---

## 8. Business rules (each needs a test)

1. An expense can be raised only against an `APPROVED`/`LOCKED` budget of the active, open financial year.
2. Sum of `budget_items.amount` must equal `budgets.total_amount` or submit is rejected.
3. Sum of all department budgets must not exceed the college ceiling set by Management.
4. If amount > category Available: block, or escalate to Management, per `settings.over_budget_policy`. Respond `409 INSUFFICIENT_BALANCE`.
5. Requester cannot approve own request. Approver limit must be ≥ amount.
6. Amount > 0. Date not inside a closed period. Bill upload mandatory before `PAID`.
7. Only `APPROVED` expenses can become `PAID`. Paid records are immutable; corrections use a reversing entry by FINANCE with a reason.
8. Rejection or cancellation releases the committed amount in the same transaction.
9. A transfer must not reduce the source category below (Committed + Spent).
10. Closing a financial year makes its budgets and expenses read-only.
11. Every change writes an `audit_logs` row inside the same transaction.

**Approval chain (limits come from `approval_limits`; these are defaults):**

| Amount (INR) | Chain |
| --- | --- |
| up to 10,000 | HOD |
| 10,001 to 1,00,000 | HOD → FINANCE |
| above 1,00,000 | HOD → FINANCE → MANAGEMENT |

---

## 9. REST API conventions

- Base: `/api/v1`. JSON only (except file upload: `multipart/form-data`).
- Auth header: `Authorization: Bearer <accessToken>`.
- Methods: `GET` read, `POST` create or trigger action, `PUT`/`PATCH` change, `DELETE` only for drafts.
- Status codes: `200`, `201` (resource created), `400` invalid input, `401` not logged in, `403` not allowed, `404` not found, `409` conflict (e.g. insufficient balance, invalid state transition), `429` rate limited, `500`.
- Action endpoints (`/submit`, `/approve`, `/pay`) return `200`.
- Lists accept `page`, `limit`, `sort`, plus filters `fy`, `department`, `category`, `status`, `from`, `to`. Response: `{ success, data: [...], meta: { page, limit, total } }`.
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "...", "details": {} } }`
- Middleware order on every protected route: `auth → role → department → validate → controller`.

### Endpoints

| Module | Method and path | Roles |
| --- | --- | --- |
| Auth | `POST /auth/login` | public |
| Auth | `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/change-password` | logged in |
| Users | `GET, POST /users`; `PATCH /users/:id` | SUPER_ADMIN |
| Master | `GET, POST /financial-years`; `PATCH /financial-years/:id/close` | SUPER_ADMIN, FINANCE (close: MANAGEMENT, FINANCE) |
| Master | `GET, POST, PATCH /departments` | SUPER_ADMIN |
| Master | `GET, POST, PATCH /categories` | SUPER_ADMIN, FINANCE |
| Master | `GET, POST, PATCH /vendors` | FINANCE |
| Master | `GET, PUT /settings/approval-limits` | SUPER_ADMIN, MANAGEMENT |
| Budget | `GET /budgets` | all (scoped) |
| Budget | `POST /budgets`; `POST /budgets/:id/submit` | HOD |
| Budget | `PUT /budgets/:id` | HOD, FINANCE |
| Budget | `POST /budgets/:id/review` | FINANCE |
| Budget | `POST /budgets/:id/approve`, `POST /budgets/:id/reject` | MANAGEMENT |
| Budget | `POST /budget-revisions`; `PATCH /budget-revisions/:id/decision` | HOD; FINANCE, MANAGEMENT |
| Expense | `GET /expenses`, `GET /expenses/:id` | all (scoped) |
| Expense | `POST /expenses`, `PUT /expenses/:id`, `POST /expenses/:id/submit` | HOD, STAFF |
| Expense | `POST /expenses/:id/approve`, `POST /expenses/:id/reject` | HOD, FINANCE, MANAGEMENT (by chain step) |
| Expense | `POST /expenses/:id/cancel` | owner, FINANCE |
| Expense | `POST /expenses/:id/bill` (multipart) | HOD, STAFF, FINANCE |
| Expense | `POST /expenses/:id/pay` | FINANCE |
| Control | `GET /balances`; `GET /balances/:deptId/categories` | MANAGEMENT, FINANCE, AUDITOR, SUPER_ADMIN, HOD (own), STAFF (own) |
| Dashboard | `GET /dashboard/summary`, `/monthly-trend`, `/category-split`, `/pending-approvals` | all (scoped) |
| Reports | `POST /reports`; `GET /reports/:id`; `GET /reports/:id/download` | MANAGEMENT, FINANCE, AUDITOR, HOD |
| Notify | `GET /notifications`; `PATCH /notifications/:id/read` | logged in |
| Audit | `GET /audit-logs` | SUPER_ADMIN, AUDITOR, MANAGEMENT |

Document every endpoint in Swagger when you create it.

---

## 10. Redis usage

| Purpose | Key pattern | TTL | Invalidate when |
| --- | --- | --- | --- |
| Dashboard cache | `dash:{fy}:{dept}` | 60 s | any approve, pay, cancel, or revision in that department |
| Refresh tokens | `refresh:{userId}` | token life | logout, password change, user disabled |
| Revoked tokens | `revoked:{tokenId}` | token life | auto-expire |
| Login rate limit | `login:{ip}:{email}` | 15 min | auto-expire / success |
| API rate limit | `rate:{userId}:{route}` | 1 min | auto-expire |
| Master data cache | `master:categories`, `master:departments` | 10 min | admin edits the list |
| Report job status | `report:{jobId}` | 1 h | downloaded / expired |
| Unread count | `notif:unread:{userId}` | none | user reads notifications |
| Spend lock | `lock:budget:{deptId}:{catId}` | 5 s | released after check-and-commit |
| Queues (BullMQ) | `queue:reports`, `queue:emails` | managed | job done |

Wrap every Redis call in try/catch and fall back to the database. Always set a TTL except for the unread counter.

---

## 11. Security requirements

- bcrypt for passwords; never log or return hashes.
- Access token about 15 minutes; refresh token in httpOnly, secure, sameSite cookie.
- Parameterised queries only (Prisma). If `$queryRaw` is used, use tagged template parameters, never string concatenation.
- Helmet on, CORS limited to `FRONTEND_URL`, rate limit on login and write routes.
- Uploads: allow PDF/JPG/PNG, max size from env, rename to random UUID, store outside the public web root, check MIME and extension.
- DB user for the app has no `UPDATE` or `DELETE` on `audit_logs`.
- Secrets only in environment variables. Never commit `.env`.
- HTTPS in production.

---

## 12. Environment variables (`.env.example`)

```bash
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/budget_tracker
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=5
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
TZ=Asia/Kolkata
```

Frontend: `VITE_API_URL=http://localhost:5000/api/v1`

---

## 13. Commands

```bash
# start everything (api, web, postgres, redis)
docker compose up -d

# backend
cd backend
npm install
npx prisma migrate dev          # apply migrations
npx prisma db seed              # seed departments, roles, categories, sample budgets
npm run dev                     # start API with reload
npm test                        # Jest + Supertest
npm run lint

# frontend
cd frontend
npm install
npm run dev
npm test
npm run lint
```

Make sure these scripts exist in the respective `package.json` files.

---

## 14. Coding conventions

- ES modules (`import`/`export`), `async/await`, no callbacks.
- Names: files `kebab-case` or `camelCase` consistently, DB columns `snake_case`, JS variables `camelCase`, React components `PascalCase`.
- One error class (`AppError(code, message, status, details)`) thrown by services; a single error middleware formats responses.
- No `console.log` in committed code; use the Pino logger.
- No business logic in React components; use hooks and the `api/` layer.
- Format amounts with Indian grouping (`8,00,000`) using `utils/currency.js`; dates as `DD-MM-YYYY`, timezone `Asia/Kolkata`.
- Every list endpoint is paginated. No unbounded queries.
- Commit style: `feat(module): ...`, `fix(module): ...`, `test(module): ...`. One module per branch.

---

## 15. Build order (module by module)

A step is done only when its tests pass. Do not start a step before its dependencies exist.

| Step | Module | Needs | Must pass before moving on |
| --- | --- | --- | --- |
| 0 | Project setup: folder structure, Docker Compose, Prisma migrations, Swagger, lint, CI | none | `docker compose up` works; health endpoint returns 200 |
| 1 | Auth and access control | 0 | wrong password, expired token, cross-department access all refused |
| 2 | Master data | 1 | duplicate codes rejected; only one active FY |
| 3 | Budget planning | 1, 2 | category total must equal budget total; frozen budget cannot be edited |
| 4 | Control engine (`balances`) | 3 | formulas match hand-calculated sample data |
| 5 | Expenses and approvals | 3, 4 | balance changes correctly at every status change; self-approval blocked; insufficient balance returns 409 |
| 6 | Notifications and audit log | 5 | audit row exists for every change; log is insert-only |
| 7 | Dashboard | 4 | totals equal control engine figures |
| 8 | Reports | 4, 5 | report totals equal dashboard totals |
| 9 | Integration and deployment | all | full role walk-through passes on seed data |

---

## 16. Testing requirements

- Each module has Jest tests covering: normal case, boundary case (exactly at limit, exactly 70 percent, exactly zero balance), failure case (negative amount, missing bill, wrong role, wrong department).
- API tests with Supertest run against a separate test database.
- Seed data used for tests: 4 departments with known budgets and expenses so every expected figure is checkable by hand.
- Concurrency test: two simultaneous submits that together exceed the balance. Exactly one must succeed.
- Cross-check test: sum of department Available + Spent + Committed equals total Allocated.
- Role matrix test: for each role, call every endpoint and assert allowed or `403`.

---

## 17. Definition of done (for every task)

1. Code follows sections 3, 4 and 14.
2. Zod validation exists on the endpoint.
3. Role and department middleware applied.
4. Audit log written (for any write).
5. Swagger entry added.
6. Tests written and passing; lint passes.
7. No duplicate balance logic outside `modules/balances`.
8. Works when Redis is stopped.

---

## 18. Out of scope (do not build unless asked)

Payroll, student fee collection, online payment gateway or bank integration, native mobile app, multi-campus support.

## 19. Future ideas (do not build now)

Year-end spend forecasting, inventory link, AI budget suggestions from 3-year history, push notifications, ERP integration.
