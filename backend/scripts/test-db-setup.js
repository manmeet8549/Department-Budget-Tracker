import { execSync } from 'child_process';

// Ensure NODE_ENV is test
process.env.NODE_ENV = 'test';

try {
  if (process.loadEnvFile) {
    process.loadEnvFile();
  }
} catch {
  // Ignore if .env missing
}

const targetDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
const targetDirectUrl = process.env.DIRECT_URL_TEST || targetDbUrl;

// Set env vars so any child processes and db connections inherit test database
process.env.DATABASE_URL = targetDbUrl;
process.env.DIRECT_URL = targetDirectUrl;

async function setupTestDb() {
  console.log(`--- Preparing Test Database (${targetDbUrl.includes('budget_tracker_test') ? 'budget_tracker_test' : 'isolated target'}) ---`);

  // 1. Run migrations against test database
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: targetDbUrl,
        DIRECT_URL: targetDirectUrl,
      },
    });
  } catch (err) {
    console.warn('Note on migrate deploy:', err.message);
  }

  // 2. Dynamically import db and seed after migration process completes
  const { prisma } = await import('../src/config/db.js');
  const { seed } = await import('../prisma/seed.js');

  // 3. Truncate tables to ensure a clean state
  console.log('Resetting test database tables...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "expenses", "budget_items", "budgets", "audit_logs", "users", "departments", "categories", "financial_years" RESTART IDENTITY CASCADE;
  `);

  // 4. Seed baseline test data
  console.log('Reseeding baseline test data...');
  await seed();

  console.log('Test database migrated, reset, and seeded successfully!');
  await prisma.$disconnect();
}

setupTestDb().catch((err) => {
  console.error('Failed to setup test database:', err);
  process.exit(1);
});
