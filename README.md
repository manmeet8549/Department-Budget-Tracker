# Department Budget Spending Tracker

> College budget management system — React + Node.js + PostgreSQL + Redis

## Quick start (requires Docker)

```bash
cp .env.example .env          # fill in secrets
docker compose up -d          # starts api, web, postgres, redis

# Then seed the database:
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
```

## Documents

| File | Purpose |
|---|---|
| [techstack.md](./techstack.md) | Stack, hard rules, API conventions — highest authority |
| [architecture.md](./architecture.md) | Module layers, iteration plan, testing gates |
| [design.md](./design.md) | Frontend visual style and design tokens |
| [PROJECT.md](./PROJECT.md) | Full product requirements and feature specification |

## Build order

See `techstack.md` §15 and `architecture.md` §8. Start at **Iteration 0** (foundation).

## Tech stack

- **Frontend:** React (Vite), TanStack Query, React Hook Form + Zod, Recharts
- **Backend:** Node.js (LTS), Express.js
- **Database:** PostgreSQL via Prisma
- **Cache/Queue:** Redis + BullMQ
- **Auth:** JWT + bcrypt
- **DevOps:** Docker Compose, GitHub Actions, Nginx, PM2
