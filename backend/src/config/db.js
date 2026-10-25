/**
 * src/config/db.js
 * Prisma client singleton.
 * Automatically switches to DATABASE_URL_TEST in test environment (NODE_ENV=test).
 */
import { PrismaClient } from '@prisma/client';

try {
  if (process.loadEnvFile) {
    process.loadEnvFile();
  }
} catch {
  // Ignore if .env is not present (e.g. in containerized CI environments)
}

if (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  if (process.env.DIRECT_URL_TEST) {
    process.env.DIRECT_URL = process.env.DIRECT_URL_TEST;
  }
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
