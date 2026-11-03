# Production Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide walks you through deploying the **Department Budget Spending Tracker** with:
- **Backend API & Database** deployed on **[Render](https://render.com)**.
- **Frontend SPA** deployed on **[Vercel](https://vercel.com)**.
- **24/7 Keep-Alive Protection** so your Render backend does not spin down after 15 minutes of inactivity on the free tier.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Vercel Edge Network           │
                      │   Frontend (React + Vite + Tailwind)   │
                      │       https://your-app.vercel.app       │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS withCredentials
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Render Web Service            │
                      │       Backend (Node.js + Express)      │
                      │     https://your-api.onrender.com      │
                      └────────────┬─────────────▲─────────────┘
                                   │             │ Keep-Alive Pings
                       Prisma ORM  │             │ (Every 12-14 mins)
                                   ▼             │
                      ┌──────────────────────────┴─────────────┐
                      │      PostgreSQL (Render / Neon /       │
                      │         Supabase Database)             │
                      └────────────────────────────────────────┘
```

---

## Step 1: Deploy Database (PostgreSQL)

You can use **Render PostgreSQL**, **Neon**, or **Supabase**.

### Option A: Render PostgreSQL (Recommended for simplicity)
1. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **PostgreSQL**.
2. Set:
   - **Name:** `budget-tracker-db`
   - **Database:** `budget_tracker`
   - **User:** `budget_user`
   - **Region:** Choose the region closest to you (e.g. Frankfurt, Oregon, Singapore).
   - **Plan:** Free
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (if deploying backend in the same Render region) or the **External Database URL**.

---

## Step 2: Deploy Backend on Render

You can deploy the backend using the automated **Render Blueprint** (`render.yaml`) or manually via the dashboard.

### Option A: 1-Click Blueprint Deploy (Fastest)
1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Select your connected GitHub repository (`Department-Budget-Tracker`).
3. Render will read `render.yaml` automatically and configure:
   - Root directory: `backend`
   - Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start command: `npm start`
   - Health check path: `/health`
4. Provide the required environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `DIRECT_URL`: Same as `DATABASE_URL`.
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-project.vercel.app`).
5. Click **Apply**.

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `budget-tracker-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Region:** Same region as your database
   - **Branch:** `main` (or your active release branch)
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Under **Advanced Settings**, set:
   - **Health Check Path:** `/health`
   - **Auto-Deploy:** Yes
5. Add the **Environment Variables**:

| Variable | Recommended Value | Note |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render default port |
| `DATABASE_URL` | `postgresql://...` | Connection string to your PostgreSQL |
| `DIRECT_URL` | `postgresql://...` | Same as DATABASE_URL |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Vercel production URL (comma-separated if multiple) |
| `ALLOW_VERCEL_PREVIEWS`| `true` | Allows preview PR deployments (`*.vercel.app`) |
| `JWT_SECRET` | `[generate-random-64-char-string]` | Secret key for signing auth tokens |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifespan |
| `JWT_REFRESH_EXPIRES`| `7d` | Refresh token lifespan |
| `COOKIE_SAME_SITE` | `none` | **Crucial:** Required for cross-domain cookies on Vercel |
| `COOKIE_SECURE` | `true` | Required when `sameSite` is `none` |
| `KEEP_ALIVE_ENABLED` | `true` | Prevents 15-minute inactivity spin down |
| `KEEP_ALIVE_INTERVAL_MINUTES` | `12` | Ping interval (under 15-minute threshold) |
| `LEDGER_ENABLED` | `false` | Set `true` if EVM blockchain anchoring is enabled |
| `LEDGER_CHAIN` | `disabled` | Set `sepolia` or `amoy` if anchoring |

6. Click **Create Web Service**.
7. Once deployed, note down your Render service URL: `https://your-backend.onrender.com`.

### Optional Initial Seeding
To populate initial master data (departments, categories, default admin accounts):
- In Render Dashboard, go to your Web Service -> **Shell**, and run:
  ```bash
  npm run db:seed
  ```
- Or run it locally against the production database:
  ```bash
  DATABASE_URL="your-production-database-url" npm run db:seed
  ```

---

## Step 3: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`Department-Budget-Tracker`).
3. Configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** Click "Edit" and choose `frontend` (or leave default if relying on root `vercel.json`).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Expand **Environment Variables** and add:

| Name | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com` | Your Render backend URL |

> [!NOTE]
> The frontend client automatically normalizes `VITE_API_URL`. Whether you enter `https://your-backend.onrender.com` or `https://your-backend.onrender.com/api/v1`, requests are properly routed to `/api/v1/*`.

5. Click **Deploy**.
6. Once deployment finishes, copy your Vercel URL (e.g. `https://your-project.vercel.app`).
7. Update `FRONTEND_URL` in your Render Web Service environment variables to match this Vercel URL.

---

## Step 4: Keeping Render Awake (Preventing the 15-Minute Free Tier Spin-Down)

Render free Web Services automatically spin down (suspend) after **15 minutes** of receiving no incoming HTTP traffic. The next request incurs a cold-start delay of 30–50 seconds.

We have implemented a **3-tier fail-safe solution** to guarantee zero downtime:

### Tier 1: Built-in Internal Self-Ping (Active Out-of-the-Box)
- The backend contains a self-pinger service in `src/modules/platform/keepAlive.js`.
- On Render, the platform automatically injects the `RENDER_EXTERNAL_URL` environment variable.
- The server automatically schedules a lightweight GET request to its own `/health` endpoint every **12 minutes**.
- Because this request traverses Render's routing mesh, Render records it as incoming activity, resetting the 15-minute idle countdown timer indefinitely.

### Tier 2: GitHub Actions Scheduled Cron Pinger (External Fail-Safe)
If the server is ever rebooted, updated, or temporarily stopped, an internal process timer cannot wake itself up. The repository includes an automated GitHub Action workflow: [`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml).

1. In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** (or Repository variable):
   - **Name:** `RENDER_BACKEND_URL`
   - **Value:** `https://your-backend.onrender.com`
3. The workflow runs every 14 minutes (`*/14 * * * *`), making a secure HTTP probe to your Render service from GitHub cloud runners, waking it up even if it was suspended.

### Tier 3: Free External Uptime Monitor (Optional 2-Minute Setup)
For additional observability and alerts, configure a free monitor:
1. Create a free account on [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org/).
2. Add a new monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Budget Tracker Backend
   - **URL:** `https://your-backend.onrender.com/health`
   - **Monitoring Interval:** Every 5 minutes (or 10 minutes)
3. This guarantees constant traffic and sends you email alerts if your service ever goes down.

---

## Step 5: Verification & Post-Deployment Checklist

- [ ] **Health Probe:** Visit `https://your-backend.onrender.com/health` in your browser. It should return `{"success":true,"data":{"status":"ok",...}}`.
- [ ] **Root Status:** Visit `https://your-backend.onrender.com/`. It should return a JSON status message.
- [ ] **Frontend Loading:** Open your Vercel URL `https://your-app.vercel.app`. The login page should render with custom styling and gradients.
- [ ] **CORS & Authentication:** Log in with seeded credentials (`superadmin@college.edu` / `Password@123`).
  - Open DevTools Network tab. Check the `POST /api/v1/auth/login` request.
  - Verify that the `refreshToken` cookie is set with `SameSite=None; Secure`.
  - Refresh the page and confirm you remain logged in.
- [ ] **SPA Direct URL Refresh:** Navigate to `/budgets` or `/integrity` and press browser refresh (F5). Confirm Vercel serves the page without 404 errors.

---

## Troubleshooting

### Issue 1: CORS Error in Browser Console
**Symptom:** `Access to fetch at 'https://...onrender.com' from origin 'https://...vercel.app' has been blocked by CORS policy`.
- **Fix:** In Render environment variables, verify `FRONTEND_URL` exactly matches your Vercel domain without trailing slash (e.g. `https://your-project.vercel.app`).
- If testing on preview branches, ensure `ALLOW_VERCEL_PREVIEWS=true` is set.

### Issue 2: Logging In Works, But Refreshing Page Logs Out
**Symptom:** Refreshing the browser requires logging in again.
- **Cause:** Cross-domain cookies (`vercel.app` to `onrender.com`) are blocked if `SameSite` is not `None` or `Secure` is false.
- **Fix:** Ensure `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` in Render environment variables.

### Issue 3: Database Migrations Not Applied
**Symptom:** API logs show `Table "public.users" does not exist`.
- **Fix:** Ensure the Render Build Command is `npm install && npx prisma generate && npx prisma migrate deploy`. If needed, open Render Shell and run `npx prisma migrate deploy`.

