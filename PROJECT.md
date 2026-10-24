# Department Budget Spending Tracker – Project Documentation

Oct 25, 2026 · @Manmeet Singh

## 1. Project overview

The Department Budget Spending Tracker is a web application that lets the college fix an annual budget for each department, then records and controls every rupee spent against that budget in real time. The college today has four departments: Engineering Block (ET), Pharmacy Block (Pharma), Hotel Management Block (HM) and MT Block (BBA and B.Com classes).

### 1.1 Problem it solves

- Budgets are decided once a year, but spending is tracked on paper or in scattered Excel files, so nobody knows the true balance mid-year.
- Departments can overspend before management notices.
- Preparing audit and committee reports takes days of manual collection.
- There is no record of who approved which expense, or why.

### 1.2 Objectives

1. Give every department a clear, approved budget for the financial year, split by category (equipment, lab consumables, events, maintenance and so on).
2. Record each expense against the correct department and category, with proof (bill or invoice).
3. Block or flag spending that would cross the available balance.
4. Show management live budget versus actual figures for all four departments on one dashboard.
5. Keep a tamper-proof history of every budget change and every approval.
6. Produce ready-to-print reports for audits and committee meetings.

### 1.3 Key terms used in this document

| Term | Meaning |
| --- | --- |
| Financial year (FY) | The period the budget covers, e.g. 1 April 2026 to 31 March 2027 |
| Allocated budget | Amount management approves for a department for the FY |
| Category budget | Part of a department's budget set aside for one type of spending |
| Committed amount | Money reserved by an approved purchase request but not yet paid |
| Spent amount | Money actually paid out and recorded as an expense |
| Available balance | Allocated budget minus committed amount minus spent amount |
| Utilisation % | (Committed + Spent) divided by Allocated budget, shown as a percentage |

## 2. Scope, departments and users

The system covers budget planning, spending, approval and reporting for four departments, managed by one central finance office. It does not process real payments or replace the college's accounting software; it tracks and controls spending decisions.

### 2.1 Departments (blocks)

| Code | Department | Typical spending areas |
| --- | --- | --- |
| ET | Engineering Block | Lab equipment, workshop tools, software licences, project materials, faculty development |
| Pharma | Pharmacy Block | Chemicals and reagents, lab consumables, instrument calibration, glassware, field visits |
| HM | Hotel Management Block | Kitchen and bakery supplies, housekeeping lab items, training restaurant stock, industry tours |
| MT | MT Block (BBA and B.Com) | Guest lectures, seminars and workshops, books and journals, smart-class upkeep, events |

The MT Block has two programmes (BBA, B.Com). Each is stored as a sub-unit of MT, so that MT's total budget can be split between them and reported separately if management wants.

The design treats departments as data, not fixed code. A fifth block added next year is created from the admin screen, with no code change.

### 2.2 Users and roles

| Role | Who | What they can do |
| --- | --- | --- |
| Super Admin | IT cell / project owner | Manage users, departments, categories, system settings |
| Management (Principal / Director) | Final authority | Approve annual budgets, approve high-value expenses, view all dashboards and reports |
| Finance Officer / Accountant | College accounts office | Prepare budget drafts, verify bills, mark expenses as paid, close the year, generate reports |
| Head of Department (HoD) | One per block | Propose department budget, raise and approve expenses within limit, view own department only |
| Department Staff | Lab in-charge, coordinator, faculty | Raise expense or purchase requests for their own department |
| Auditor (read only) | Internal or external auditor | View all records, bills and audit logs; cannot edit anything |

Rule that applies everywhere: a user sees only the data of their own department, except Management, Finance, Auditor and Super Admin, who see all departments.

### 2.3 Out of scope (first version)

- Salary and payroll processing
- Student fee collection
- Online payment gateway or bank integration
- Mobile app (the website is made mobile-friendly instead)

## 3. Budget lifecycle: how it is decided and how it is spent

A budget goes through two phases. Before the year, each department asks, Finance reviews, Management approves, and the approved amount is frozen as the Allocated budget. During the year, every expense is checked against what is left, approved by amount, reserved as Committed, and finally recorded as Spent.

&#91;embedded content: budget lifecycle · 2 phases, 2 decisions\]

### 3.1 Phase A: how the budget is decided

1. **Proposal.** Before the new financial year, each HoD enters the amount needed per category, with a reason and last year's actual spending shown next to it.
2. **Finance review.** The Finance Officer checks the figures, adds remarks, adjusts where needed and merges the four department proposals into one college budget draft.
3. **Management decision.** Management compares the draft with last year and the college's overall ceiling, then approves, or sends it back with comments (the proposal returns to the HoD).
4. **Freeze.** On approval, each department's total becomes its Allocated budget and each category amount becomes a category budget. From then on, changes are possible only through a recorded revision or transfer.

### 3.2 Phase B: how the budget is used

1. **Request.** Staff or the HoD raises an expense request for a category, with vendor, amount, purpose and quotation.
2. **Balance check.** The system compares the amount with the category's Available balance. If it is higher, the request is blocked or escalated to Management, depending on the admin setting.
3. **Approval by amount.** Small requests need only the HoD; larger ones also need Finance and, above the top limit, Management. A rejection or cancellation ends the request and releases any reserved amount.
4. **Committed.** Once approved, the amount is reserved, so another request cannot use the same money.
5. **Paid and Spent.** Finance records payment and attaches the bill. The amount moves from Committed to Spent.
6. **Visibility.** Dashboard, alerts and reports update from the same figures after each step (Modules 5 to 8).

### 3.3 Worked example (illustrative figures)

The Engineering Block (ET) has an Equipment category budget of 8,00,000 rupees for FY 2026-27.

| Event | Allocated | Committed | Spent | Available |
| --- | --- | --- | --- | --- |
| Budget frozen | 8,00,000 | 0 | 0 | 8,00,000 |
| Lab equipment request of 1,50,000 approved | 8,00,000 | 1,50,000 | 0 | 6,50,000 |
| Request paid with bill attached | 8,00,000 | 0 | 1,50,000 | 6,50,000 |
| New request of 7,00,000 raised | Blocked or escalated, because 7,00,000 is more than the 6,50,000 available |  |  |  |

After payment, utilisation is 1,50,000 divided by 8,00,000, which is 18.75 percent: status Normal.

## 4. System architecture and module map

The system is a web application with three layers: users in a browser, eight modules on the server, and a data layer made of a PostgreSQL database, a Redis cache and a file store for bills. Module 5, the control engine, is the centre: it is the only place where balances are calculated, so dashboard, alerts and reports can never disagree.

&#91;embedded content: system architecture · 8 modules, 3 layers\]

How the modules work together:

- Modules 3 and 4 write budget and expense records; Module 5 reads them and produces the figures.
- Modules 6 and 7 only read figures from Module 5. They never calculate their own totals.
- Module 1 checks the user's role and department on every request, in every module.
- Module 2 supplies the lists (years, departments, categories, vendors, limits) that the other modules pick from.
- Module 8 listens to every module and records each action, so no module has to write its own log.

Because modules depend on each other only in this one direction, each can be built and tested on its own, in the order given in section 7.

## 5. Module-wise feature specification

The system is split into eight modules. Each can be built, tested and demonstrated on its own, in the order shown in section 7. Every module lists its purpose, features, inputs, outputs and what it depends on.

### Module 1: Authentication and access control

**Purpose:** make sure only the right person sees and does the right thing.

- Login with username or email and password (passwords stored hashed, never as plain text).
- Role-based access: Super Admin, Management, Finance, HoD, Staff, Auditor (section 2.2).
- Department lock: HoD and Staff are tied to one department and cannot open another's data.
- Session timeout after inactivity, forgot-password and change-password.
- Admin screen to create, disable and reassign users.

**Inputs:** user details, role, department. **Outputs:** logged-in session with permissions. **Depends on:** nothing (build first).

### Module 2: Master data setup

**Purpose:** define the fixed lists every other module uses, so that nobody types free-text names and data stays clean.

- **Financial year:** create FY (start and end date), mark one as active, lock it when closed.
- **Departments:** ET, Pharma, HM, MT, each with code, name, HoD and status. MT has sub-units BBA and B.Com.
- **Expense categories:** a common list such as Equipment, Consumables, Maintenance, Events and Seminars, Books and Journals, Travel and Tours, Software, Miscellaneous. Admin can add more.
- **Vendors:** name, contact, GST number (optional), so repeat purchases are easy to pick.
- **Approval limits:** the rupee amount up to which each role can approve (see Module 4).

**Inputs:** admin entries. **Outputs:** dropdown lists and rules used by all modules. **Depends on:** Module 1.

### Module 3: Budget planning and allocation

**Purpose:** decide how much each department gets for the year and how it is divided. This is where the budget is born.

- **Budget proposal:** each HoD enters a requested amount per category for the coming FY, with a short justification and last year's actual spending shown alongside for reference.
- **Finance review:** the Finance Officer checks each proposal, can edit amounts with a remark, and consolidates all four departments into one draft college budget.
- **Management approval:** Management sees the draft with total, department-wise split and comparison with last year, then approves, rejects with comments, or sends back for changes.
- **Allocation:** once approved, the budget becomes the department's Allocated Budget for the FY and is frozen. Category-wise amounts become category budgets.
- **Budget status:** Draft, Submitted, Under Review, Approved, Rejected, Locked.
- **Budget revision and transfer:** during the year a HoD can request an increase, or a transfer of money between two categories of the same department. Transfers between departments need Management approval. Every revision keeps the old and new figures.
- **Monthly or quarterly phasing (optional):** spread the yearly amount over months so that early-year overspending is visible.

**Inputs:** proposals, remarks, approvals. **Outputs:** approved department and category budgets. **Depends on:** Modules 1 and 2.

### Module 4: Expense and purchase request with approval workflow

**Purpose:** record how the budget is actually used, with control before the money goes out.

- **Raise a request:** staff or HoD selects department, category, vendor, amount, date, purpose, and uploads a quotation or bill (PDF or image).
- **Instant budget check:** before submitting, the screen shows the category's available balance and warns if the request exceeds it.
- **Approval chain by amount** (limits are set by admin, the numbers below are only an example):

| Request amount (example) | Approval needed |
| --- | --- |
| Up to 10,000 | HoD |
| 10,001 to 1,00,000 | HoD, then Finance Officer |
| Above 1,00,000 | HoD, Finance Officer, then Management |

- **Statuses:** Draft, Submitted, Approved, Rejected, Paid, Cancelled. An Approved request moves its amount from Available to Committed.
- **Mark as paid:** Finance enters payment date, mode and reference, and attaches the final bill. The amount moves from Committed to Spent.
- **Direct small expenses:** petty cash entries that skip the quotation step but still need a bill and the HoD's approval.
- **Rejection and cancellation:** a rejected or cancelled request releases any committed amount back to Available.

**Inputs:** request details, bills, approver decisions. **Outputs:** expense records, updated committed and spent amounts. **Depends on:** Modules 1, 2 and 3.

### Module 5: Budget control engine

**Purpose:** the calculation core that keeps every number correct. It has no screens of its own; Modules 3, 4, 6 and 7 all read from it, so a figure is calculated in one place only.

- Calculates, per department and per category: Allocated, Committed, Spent, Available and Utilisation %.
- Runs a check on every request: if the amount is more than Available, the request is blocked, or sent for a special over-budget approval by Management (admin chooses which).
- Updates balances automatically when a request is approved, paid, rejected, cancelled, or when a budget is revised.
- Applies threshold rules: Normal below 70% used, Warning from 70%, Critical from 90%, Exceeded above 100% (percentages set by admin).
- Supports month-end and year-end snapshots, so historical figures never change after a period is closed.

```latex
Available = Allocated - Committed - Spent
```

```latex
Utilisation\ \% = \frac{Committed + Spent}{Allocated} \times 100
```

**Inputs:** budget and expense records. **Outputs:** balances, status flags, alert triggers. **Depends on:** Modules 3 and 4.

### Module 6: Dashboard

**Purpose:** show at a glance how each department is doing against its budget.

- **Management and Finance view:** four department cards (ET, Pharma, HM, MT) each showing Allocated, Spent, Committed, Available and a colour-coded progress bar (green, amber, red by threshold). Below them: a bar chart of budget versus actual per department, a line chart of monthly spending, and a pie chart of spending by category.
- **HoD view:** the same for their own department, plus a list of pending approvals and a category-wise table of balances.
- **Staff view:** their own requests and status.
- Filters by financial year, month, category and department.
- Top lists: five largest expenses, five most overspent categories, requests waiting longest for approval.

**Inputs:** Module 5 figures. **Outputs:** charts and cards only (read-only). **Depends on:** Module 5.

### Module 7: Reports and export

**Purpose:** give ready documents for audits, committee meetings and year-end closing.

| Report | Content |
| --- | --- |
| Department budget summary | Allocated, spent, committed, balance for one department by category |
| College consolidated report | All four departments side by side with totals |
| Budget versus actual (monthly) | Planned phasing against real spending, with variance |
| Expense register | Every expense with date, vendor, bill number, approver, status |
| Vendor-wise report | Total paid to each vendor |
| Pending approvals report | Requests stuck at each stage and for how long |
| Revision and transfer report | All budget changes with old and new values |
| Year-end closing report | Final position, unspent balance, overspend, comparison with previous year |

- Export to PDF and Excel; every report can be filtered by FY, department, category and date range.
- Reports are generated only from Module 5 and the expense table, so the numbers always match the dashboard.

**Inputs:** filters. **Outputs:** PDF and Excel files. **Depends on:** Modules 4 and 5.

### Module 8: Notifications and audit log

**Purpose:** keep people informed and keep a permanent, unchangeable record.

- **Notifications (in-app, with optional email):** request waiting for your approval, request approved or rejected, department crossed 70%, 90% or 100%, budget revision decided, financial year about to close.
- **Audit log:** every create, edit, approve, reject, pay, cancel, login and permission change is recorded with who, what, when, old value and new value. Log entries cannot be edited or deleted by anyone, including Super Admin.
- **Soft delete only:** records are marked inactive instead of removed, so history is never lost.
- Auditor role gets read-only access to the log and attached bills.

**Inputs:** events from all modules. **Outputs:** alerts and the audit trail. **Depends on:** Module 1 (and hooks into all others).

## 6. Database design and business rules

The database has nine main tables. Money values are stored as exact decimals (not floating point), and every table has created-at, updated-at and created-by columns.

### 6.1 Main tables

| Table | Key fields | Purpose |
| --- | --- | --- |
| users | id, name, email, password\_hash, role, department\_id, is\_active | Login and permissions |
| departments | id, code, name, parent\_id, hod\_user\_id, is\_active | ET, Pharma, HM, MT; parent\_id links BBA and B.Com under MT |
| financial\_years | id, label, start\_date, end\_date, status | One active FY at a time |
| categories | id, name, is\_active | Expense categories |
| budgets | id, fy\_id, department\_id, total\_amount, status, approved\_by, approved\_on | One approved budget per department per FY |
| budget\_items | id, budget\_id, category\_id, amount, justification | Category-wise split of a budget |
| budget\_revisions | id, budget\_item\_id, type, old\_amount, new\_amount, reason, status | Increases and transfers, with history |
| expenses | id, fy\_id, department\_id, category\_id, vendor\_id, amount, purpose, status, bill\_file, paid\_on, payment\_ref | Every request and payment |
| approvals | id, entity\_type, entity\_id, step\_no, approver\_id, decision, remark, decided\_on | Approval trail for budgets, revisions and expenses |
| audit\_logs | id, user\_id, action, table\_name, record\_id, old\_value, new\_value, timestamp | Permanent history (insert only) |

Supporting tables: vendors, notifications, approval\_limits, settings (thresholds, over-budget policy).

### 6.2 Relationships in words

- One department has many users and many budgets (one per financial year).
- One budget has many budget items (one per category).
- One expense belongs to one department, one category, one vendor and one financial year.
- One expense has many approval steps.
- Balances are calculated from budget items and expenses; they are not stored as typed-in numbers, so they cannot drift out of sync.

### 6.3 Business rules (the checklist that keeps results error free)

1. An expense can only be raised against an approved, unlocked budget of the active financial year.
2. The sum of category amounts in a budget must equal the budget total; otherwise it cannot be submitted.
3. Total of all department budgets cannot exceed the college's overall approved ceiling (set by Management).
4. A request larger than the category's Available amount is blocked or escalated, according to the admin setting.
5. The person who raises a request cannot approve it. Nobody can approve a request above their own limit.
6. Amount must be greater than zero; date cannot be in a closed period; bill upload is mandatory before marking Paid.
7. Only Approved requests can become Paid; Paid records cannot be edited, only corrected through a reversing entry by Finance with a reason.
8. Rejection or cancellation releases the committed amount in the same step.
9. Moving budget between categories must not make the source category go below what it has already committed and spent.
10. When a financial year is closed, its budgets, expenses and figures become read-only; unspent balance is reported but not carried over unless Management decides.
11. Every change is written to the audit log in the same database transaction as the change itself; if either fails, both are cancelled.

## 7. Development plan, testing and tech stack

Build the modules in the order below. A module is finished only when its test column passes; the next module then starts on a stable base. Team members can work in parallel once Modules 1 and 2 exist.

### 7.1 Build order

| Step | Module | Needs first | Demo at the end of the step | Must pass before moving on |
| --- | --- | --- | --- | --- |
| 1 | Module 1: Authentication and access | None | Log in as each role; HoD of ET cannot open Pharma | Wrong password, expired session and cross-department access are all refused |
| 2 | Module 2: Master data | 1 | Create FY, four departments, categories, vendors | Duplicate codes rejected; only one active FY |
| 3 | Module 3: Budget planning | 1, 2 | Proposal, review, approval and freeze for all four departments | Category total must equal budget total; frozen budget cannot be edited |
| 4 | Module 5: Control engine | 3 | Balances shown for a test budget | Formulas in section 5 give correct figures on hand-calculated samples |
| 5 | Module 4: Expenses and approvals | 3, 5 | Raise, approve, pay, reject, cancel a request end to end | Balance changes correctly at each status change; self-approval blocked |
| 6 | Module 8: Notifications and audit | 4 | Alerts at 70, 90, 100 percent; log of every action | Log entry exists for every change; log cannot be edited |
| 7 | Module 6: Dashboard | 5 | Management and HoD dashboards | Dashboard totals equal the control engine figures |
| 8 | Module 7: Reports | 5, 4 | PDF and Excel for all eight reports | Report totals equal dashboard totals |
| 9 | Integration, user testing, deployment | All | Full walk-through with real department sample data | All test cases below pass |

### 7.2 How to keep the result error free

- **One source of truth:** balances are always calculated from budget and expense records by Module 5. Dashboard, reports and alerts never compute their own totals.
- **Validation on both sides:** the screen checks input for quick feedback; the server checks again, because the screen can be bypassed.
- **Database transactions:** a status change, the balance effect and the audit entry succeed or fail together.
- **Test cases per module:** write them from the business rules in section 6.3. Include normal cases, boundary cases (exactly at the limit, exactly 70 percent, exactly zero balance) and failure cases (negative amount, missing bill, wrong role).
- **Sample data set:** prepare a fixed set of four departments with known budgets and expenses so that every expected figure can be checked by hand.
- **Role walk-through test:** log in as each role and try every menu item, to confirm that nobody sees or does more than allowed.
- **Cross-check:** at the end of each build step, total of department balances plus spent plus committed must equal the college total allocated.

### 7.3 Technology

The stack is fixed: React.js frontend, Node.js with Express.js backend, PostgreSQL database, Redis for caching and background jobs, and a RESTful JSON API with JWT login. Every layer, library, endpoint and Redis use is listed in section 8.

Before Module 1 is started, do a short step 0: set up the folder structure, Docker Compose, database migrations and Swagger (section 8.7).

### 7.4 Suggested team split for module-wise production

- Member 1: Modules 1 and 2 (login, roles, master data), then Module 8.
- Member 2: Modules 3 and 5 (budget planning and control engine).
- Member 3: Module 4 (expenses and approvals).
- Member 4: Modules 6 and 7 (dashboard and reports), and final testing.

Adjust to the number of people in your group; the build order in 7.1 stays the same.

### 7.5 Future enhancements

- Forecast year-end spending from the current monthly pace and warn early.
- Link purchase requests to inventory, so purchased items appear in stock.
- Budget proposal suggestions based on the last three years of actual spending.
- Mobile app with push notifications for approvers.
- Integration with the college's accounting or ERP system.
- Multi-campus support.

## 8. Technology stack, REST API and Redis design

The project is built with React.js for the frontend, Node.js with Express.js for the backend, PostgreSQL as the database, Redis for caching and background work, and a RESTful JSON API between them secured with JWT. This replaces the open options in section 7.3.

### 8.1 Database choice: PostgreSQL

PostgreSQL is recommended over MongoDB because this project is money data with strict relations: departments, budgets, categories and expenses all link to each other, and a balance must always add up.

- Exact money type (NUMERIC), so 1,50,000.50 is never rounded by floating point.
- Real transactions: an approval, the balance change and the audit entry can succeed or fail together (business rule 11).
- Foreign keys, unique and check constraints stop bad data at the database, even if the code has a bug.
- SQL aggregation (SUM, GROUP BY) calculates Allocated, Committed, Spent and monthly trends directly.
- Row locking (SELECT ... FOR UPDATE) stops two simultaneous requests from spending the same remaining balance.

MySQL would also work if your college already uses it; the rest of the stack stays the same.

### 8.2 Complete tech stack

| Layer | Technology | Purpose in this project |
| --- | --- | --- |
| Frontend core | React.js with Vite | Single-page app, fast build and reload |
| Routing | React Router | Pages per role: dashboard, budgets, expenses, reports |
| Server data | TanStack Query (React Query) | Fetching, caching and refreshing API data on screen |
| Forms and validation | React Hook Form with Zod | Budget and expense forms with instant field checks |
| UI library | Material UI or Tailwind CSS | Consistent, responsive screens and data tables |
| Charts | Recharts (or Chart.js) | Bar, line and pie charts on the dashboard |
| HTTP client | Axios | API calls with an interceptor that attaches the token and handles expiry |
| Backend runtime | Node.js (current LTS) | Server runtime |
| Backend framework | Express.js | REST routes, middleware, controllers |
| Authentication | jsonwebtoken (JWT) and bcrypt | Login tokens, password hashing |
| Validation | Zod or Joi | Server-side check of every request body and parameter |
| File upload | Multer | Bill and quotation upload with type and size limits |
| Database | PostgreSQL | Primary data store and source of truth |
| ORM and migrations | Prisma (or Sequelize) | Typed queries, schema migrations, seed data |
| Cache and queue | Redis with ioredis | Caching, token store, rate limits (section 8.3) |
| Background jobs | BullMQ (runs on Redis) | Report generation, emails, alert checks |
| Scheduled tasks | node-cron | Nightly snapshots, financial-year-end reminders |
| Reports | ExcelJS and PDFKit (or Puppeteer) | Excel and PDF exports |
| Email | Nodemailer | Approval and alert emails |
| Security middleware | Helmet, cors, express-rate-limit | Secure headers, allowed origins, request throttling |
| Logging | Pino or Winston, with Morgan | Application and request logs |
| API documentation | Swagger (OpenAPI) | Live, testable documentation of every endpoint |
| Testing | Jest, Supertest, React Testing Library | Unit, API and component tests |
| API testing | Postman collection | Manual and shared endpoint checks |
| Code quality | ESLint, Prettier, Husky | Same code style, checks before each commit |
| Version control and CI | Git, GitHub, GitHub Actions | Branches per module, automatic test run on each push |
| Containers | Docker and Docker Compose | One command starts app, PostgreSQL and Redis on any machine |
| Web server | Nginx and PM2 | Reverse proxy, HTTPS, process restart |

### 8.3 Where Redis is used

Redis is a fast helper, not the source of truth. All real data lives in PostgreSQL; if Redis is down, the system falls back to the database, slower but still correct.

| Use | Example key | Expiry | Cleared or changed when |
| --- | --- | --- | --- |
| Dashboard cache | dash:{fy}:{dept} | 60 seconds | Any approval, payment, cancellation or budget revision in that department |
| Refresh tokens and logout list | refresh:{userId}, revoked:{tokenId} | Token lifetime | User logs out, password changes or account is disabled |
| Login rate limit | login:{ip}:{email} | 15 minutes | Counter resets after expiry or successful login |
| API rate limit | rate:{userId}:{route} | 1 minute | Resets automatically |
| Master data cache | master:categories, master:departments | 10 minutes | Admin edits the list |
| Report job status and result | report:{jobId} | 1 hour | File downloaded or expired |
| Notification unread count | notif:unread:{userId} | None | User reads notifications |
| Job queue (BullMQ) | queue:reports, queue:emails | Managed by BullMQ | Job finishes, retries on failure |
| Short spend lock | lock:budget:{deptId}:{catId} | 5 seconds | Released after the check-and-commit step |

Important rule for the spend lock: it only reduces collisions. The guarantee that no category is overspent comes from the database transaction with a row lock; the check and the commit happen inside that transaction.

### 8.4 RESTful API design

**Conventions used by every endpoint**

- Base path /api/v1, JSON request and response, token sent as Authorization: Bearer.
- HTTP methods mean what they say: GET reads, POST creates or triggers an action, PUT or PATCH changes, DELETE is used only for drafts (all other records are soft-deleted).
- Status codes: 200 OK, 201 Created, 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict (for example, not enough balance), 500 server error.
- Lists accept page, limit, sort and filters such as fy, department, category and status.
- One error format everywhere: success false, then an error object with code, message and field details.
- Every endpoint passes through three checks in order: login check, role check, department check (Module 1).

**Endpoints by module** (roles: SA Super Admin, MG Management, FN Finance, HD HoD, ST Staff, AU Auditor)

| Module | Method and path | Who | Purpose |
| --- | --- | --- | --- |
| 1 Auth | POST /auth/login | Public | Log in, receive access and refresh tokens |
| 1 Auth | POST /auth/refresh | Logged in | Get a new access token |
| 1 Auth | POST /auth/logout | Logged in | End session, revoke refresh token |
| 1 Auth | POST /auth/change-password | Logged in | Change own password |
| 1 Users | GET, POST /users | SA | List and create users |
| 1 Users | PATCH /users/:id | SA | Edit, disable, change role or department |
| 2 Master | GET, POST /financial-years | SA, FN | List and create financial years |
| 2 Master | PATCH /financial-years/:id/close | MG, FN | Close and lock a year |
| 2 Master | GET, POST, PATCH /departments | SA | Manage ET, Pharma, HM, MT and sub-units |
| 2 Master | GET, POST, PATCH /categories | SA, FN | Manage expense categories |
| 2 Master | GET, POST, PATCH /vendors | FN | Manage vendors |
| 2 Master | GET, PUT /settings/approval-limits | SA, MG | Read and set approval limits and alert thresholds |
| 3 Budget | GET /budgets | All roles (own department for HD, ST) | List budgets by year and department |
| 3 Budget | POST /budgets | HD | Create a proposal with category items |
| 3 Budget | PUT /budgets/:id | HD, FN | Edit a draft or under-review budget |
| 3 Budget | POST /budgets/:id/submit | HD | Send proposal for review |
| 3 Budget | POST /budgets/:id/review | FN | Mark reviewed, add remarks, consolidate |
| 3 Budget | POST /budgets/:id/approve | MG | Approve and freeze |
| 3 Budget | POST /budgets/:id/reject | MG | Send back with comments |
| 3 Budget | POST /budget-revisions | HD | Request increase or transfer |
| 3 Budget | PATCH /budget-revisions/:id/decision | FN, MG | Approve or reject a revision |
| 4 Expense | GET /expenses | All roles (scoped) | List and filter expenses |
| 4 Expense | POST /expenses | HD, ST | Create a draft request |
| 4 Expense | GET /expenses/:id | All roles (scoped) | Details with approval trail and bill |
| 4 Expense | PUT /expenses/:id | HD, ST | Edit while in draft |
| 4 Expense | POST /expenses/:id/submit | HD, ST | Submit; runs the balance check |
| 4 Expense | POST /expenses/:id/approve | HD, FN, MG | Approve at own step |
| 4 Expense | POST /expenses/:id/reject | HD, FN, MG | Reject with reason |
| 4 Expense | POST /expenses/:id/cancel | Owner, FN | Cancel and release committed amount |
| 4 Expense | POST /expenses/:id/bill | HD, ST, FN | Upload bill or quotation (multipart) |
| 4 Expense | POST /expenses/:id/pay | FN | Mark paid with date, mode and reference |
| 5 Control | GET /balances | MG, FN, AU, HD | Allocated, Committed, Spent, Available per department |
| 5 Control | GET /balances/:deptId/categories | MG, FN, AU, HD | Same figures per category |
| 6 Dashboard | GET /dashboard/summary | All roles (scoped) | Department cards |
| 6 Dashboard | GET /dashboard/monthly-trend | All roles (scoped) | Monthly spending line |
| 6 Dashboard | GET /dashboard/category-split | All roles (scoped) | Spending by category |
| 6 Dashboard | GET /dashboard/pending-approvals | HD, FN, MG | Items waiting for the user |
| 7 Reports | POST /reports | MG, FN, AU, HD | Queue a report (type, filters, pdf or xlsx) |
| 7 Reports | GET /reports/:id | Requester | Check status |
| 7 Reports | GET /reports/:id/download | Requester | Download the finished file |
| 8 Notify | GET /notifications | Logged in | Own notifications |
| 8 Notify | PATCH /notifications/:id/read | Logged in | Mark as read |
| 8 Audit | GET /audit-logs | SA, AU, MG | Search the audit trail (read only) |

**Example: submit an expense request**

```json
POST /api/v1/expenses/412/submit

200 OK
{ "success": true, "data": { "id": 412, "status": "Submitted", "nextApprover": "Finance Officer", "availableAfter": 650000 } }

409 Conflict (not enough balance)
{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "Amount exceeds available balance of 650000 for this category", "details": { "requested": 700000, "available": 650000 } } }
```

### 8.5 Security checklist

1. Passwords hashed with bcrypt; never logged, never returned by any API.
2. Short-lived access token (for example 15 minutes) plus a refresh token in an httpOnly cookie; Redis holds the revoked list.
3. Role check and department check as Express middleware on every route, so a missed check in one controller cannot open a hole.
4. Validate every input on the server with Zod or Joi, even if the form already checked it.
5. Use the ORM or parameterised queries only, never string-built SQL, to prevent SQL injection.
6. Helmet for secure headers, CORS limited to the college frontend address, rate limits on login and write routes.
7. File upload: allow only PDF, JPG and PNG, set a size limit, rename files to random names, and store them outside the public web folder.
8. The database user used by the app has no UPDATE or DELETE permission on audit\_logs.
9. Secrets (database password, JWT secret) live in environment variables, never in Git.
10. HTTPS in production, and a daily database backup that is test-restored at least once.

### 8.6 Project folder structure (module-wise)

Each backend module holds its own routes, controller, service (business rules) and validation, so a team member can own a module end to end.

```text
budget-tracker/
  backend/
    src/
      config/          db.js, redis.js, env.js
      middleware/      auth.js, role.js, department.js, validate.js, error.js
      modules/
        auth/          routes, controller, service, schema
        users/
        master/        years, departments, categories, vendors, settings
        budgets/       proposals, approval, revisions
        expenses/      requests, approvals, payment, bills
        balances/      control engine (single source of figures)
        dashboard/
        reports/
        notifications/
        audit/
      jobs/            report.worker.js, email.worker.js, cron.js
      utils/           money.js, dates.js, logger.js
      app.js, server.js
    prisma/            schema.prisma, migrations, seed.js
    tests/             unit and api tests per module
  frontend/
    src/
      api/             axios client, one file per module
      features/        auth, budgets, expenses, dashboard, reports, admin
      components/      tables, forms, charts, layout, alerts
      hooks/           useAuth, useBalances, usePermissions
      routes/          protected routes by role
      utils/           currency format, date format
  docker-compose.yml   app, postgres, redis
  .env.example
```

### 8.7 Items added that the first version did not cover

| Addition | Why it matters |
| --- | --- |
| Redis caching, queue and rate limits | Faster dashboard, reports that do not block the screen, protection against password guessing |
| Database migrations and seed data | The same database can be rebuilt on every machine; seed data creates the four departments and sample budgets for testing |
| API documentation with Swagger | Frontend and backend members can work in parallel against a written contract |
| Standard error format and pagination | Same handling on every screen; large expense lists stay fast |
| Database indexes | On department, financial year, category, status and date columns, so dashboards and reports stay quick as data grows |
| Logging and error monitoring | Find the cause of a failure without guessing |
| Backup and restore plan | Financial records must survive a crash or a deleted server |
| Environment setup (development, testing, production) | Test data never mixes with real college data |
| Automated tests and CI | Every push runs the module tests, supporting the error-free goal |
| Docker Compose | New team members run the full project with one command |
| Rupee and date formatting | Amounts shown in Indian digit grouping (for example 8,00,000) and dates in day-month-year order, with the Indian time zone |
| Opening data import | CSV upload of last year's actuals and this year's opening budget, so history shows from day one |
| Responsive, accessible interface | HoDs and Finance can approve from a phone; clear colours and labels for all users |
| Soft delete and data retention | Records are hidden, not erased, which audits require |
| Email alerts | Approvers are notified even when they are not logged in |

Build order in section 7.1 is unchanged; set up Docker Compose, the folder structure, migrations and Swagger as step 0, before Module 1.
