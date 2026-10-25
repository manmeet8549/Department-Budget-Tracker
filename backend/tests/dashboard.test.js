import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import * as balances from '../src/modules/balances/index.js';

describe('Iteration 5: Dashboard v1 (MVP Release 1)', () => {
  let app;
  let adminToken;
  let mgmtToken;
  let finToken;
  let auditorToken;
  let hodEtToken;
  let staffEtToken;
  let hodHmToken;
  let staffHmToken;

  let activeFy;
  let etDept;
  let hmDept;
  let bbaDept;

  const login = async (email) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password@123' });
    if (!res.body?.data?.accessToken) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
    }
    return res.body.data.accessToken;
  };

  beforeAll(async () => {
    app = createApp();

    adminToken = await login('superadmin@college.edu');
    mgmtToken = await login('management@college.edu');
    finToken = await login('finance@college.edu');
    auditorToken = await login('auditor@college.edu');
    hodEtToken = await login('hod_et@college.edu');
    staffEtToken = await login('staff_et@college.edu');
    hodHmToken = await login('hod_hm@college.edu');
    staffHmToken = await login('staff_hm@college.edu');

    await prisma.financialYear.updateMany({
      where: { year: '2026-27' },
      data: { isActive: true, status: 'OPEN' },
    });
    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true, status: 'OPEN' } });

    etDept = await prisma.department.findUnique({ where: { code: 'ET' } });
    hmDept = await prisma.department.findUnique({ where: { code: 'HM' } });
    bbaDept = await prisma.department.findUnique({ where: { code: 'BBA' } });

    // Ensure ET has an APPROVED budget for tests
    const eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });
    const etBudget = await prisma.budget.upsert({
      where: { financialYearId_departmentId: { financialYearId: activeFy.id, departmentId: etDept.id } },
      update: { status: 'APPROVED', totalAmount: 800000.0 },
      create: {
        financialYearId: activeFy.id,
        departmentId: etDept.id,
        totalAmount: 800000.0,
        status: 'APPROVED',
        items: {
          create: [{ categoryId: eqCat.id, amount: 800000.0, justification: 'ET Equipment' }],
        },
      },
      include: { items: true },
    });
    if (!etBudget.items || etBudget.items.length === 0) {
      await prisma.budgetItem.upsert({
        where: { budgetId_categoryId: { budgetId: etBudget.id, categoryId: eqCat.id } },
        update: { amount: 800000.0 },
        create: { budgetId: etBudget.id, categoryId: eqCat.id, amount: 800000.0 },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication & Scoping', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/dashboard/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('HOD of ET sees only ET department card, and college summary is null', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.financialYear).toBeDefined();
      expect(res.body.data.college).toBeNull();
      expect(Array.isArray(res.body.data.departments)).toBe(true);
      expect(res.body.data.departments.length).toBe(1);
      expect(res.body.data.departments[0].code).toBe('ET');
      expect(res.body.data.departments[0].id).toBe(etDept.id);
    });

    it('STAFF of ET sees only ET department card, and college summary is null', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.college).toBeNull();
      expect(res.body.data.departments.length).toBe(1);
      expect(res.body.data.departments[0].code).toBe('ET');
    });

    it('MANAGEMENT sees college totals and all approved departments', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${mgmtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.college).not.toBeNull();
      expect(typeof res.body.data.college.allocated).toBe('string');
      expect(typeof res.body.data.college.committed).toBe('string');
      expect(typeof res.body.data.college.spent).toBe('string');
      expect(typeof res.body.data.college.available).toBe('string');
      expect(typeof res.body.data.college.utilisationPercent).toBe('number');
      expect(Array.isArray(res.body.data.departments)).toBe(true);
      expect(res.body.data.departments.length).toBeGreaterThanOrEqual(1);
    });

    it('FINANCE, AUDITOR and SUPER_ADMIN see college totals and all approved departments', async () => {
      for (const token of [finToken, auditorToken, adminToken]) {
        const res = await request(app)
          .get('/api/v1/dashboard/summary')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.college).not.toBeNull();
        expect(res.body.data.departments.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Cross-Checks & Decimal Formatting', () => {
    it('dashboard totals equal the balances module for every department and for the college', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${finToken}`);

      expect(res.status).toBe(200);
      const { college, departments } = res.body.data;

      // College cross-check
      const collegeBal = await balances.getCollegeBalance(activeFy.id);
      expect(parseFloat(college.allocated)).toBeCloseTo(collegeBal.allocated, 2);
      expect(parseFloat(college.committed)).toBeCloseTo(collegeBal.committed, 2);
      expect(parseFloat(college.spent)).toBeCloseTo(collegeBal.spent, 2);
      expect(parseFloat(college.available)).toBeCloseTo(collegeBal.available, 2);
      expect(college.utilisationPercent).toBe(collegeBal.utilisationPercentage);

      // Department cross-checks
      for (const deptCard of departments) {
        const deptBal = await balances.getDepartmentBalance(activeFy.id, deptCard.id);
        expect(parseFloat(deptCard.allocated)).toBeCloseTo(deptBal.allocated, 2);
        expect(parseFloat(deptCard.committed)).toBeCloseTo(deptBal.committed, 2);
        expect(parseFloat(deptCard.spent)).toBeCloseTo(deptBal.spent, 2);
        expect(parseFloat(deptCard.available)).toBeCloseTo(deptBal.available, 2);
        expect(deptCard.utilisationPercent).toBe(deptBal.utilisationPercentage);

        // Invariant: Available + Committed + Spent equals Allocated
        const sum = parseFloat(deptCard.available) + parseFloat(deptCard.committed) + parseFloat(deptCard.spent);
        expect(sum).toBeCloseTo(parseFloat(deptCard.allocated), 2);
      }
    });

    it('decimals stay exact two-decimal strings (e.g. 150000.50, never floats)', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${finToken}`);

      const { departments } = res.body.data;
      for (const d of departments) {
        expect(d.allocated).toMatch(/^\d+\.\d{2}$/);
        expect(d.committed).toMatch(/^\d+\.\d{2}$/);
        expect(d.spent).toMatch(/^\d+\.\d{2}$/);
        expect(d.available).toMatch(/^-?\d+\.\d{2}$/);
      }
    });

    it('a sub-unit includes its parentCode', async () => {
      // Create an approved budget for BBA (sub-unit of MT)
      const consumables = await prisma.category.findUnique({ where: { name: 'Consumables' } });
      const bbaBudget = await prisma.budget.upsert({
        where: { financialYearId_departmentId: { financialYearId: activeFy.id, departmentId: bbaDept.id } },
        update: { status: 'APPROVED', totalAmount: 75000.0 },
        create: {
          financialYearId: activeFy.id,
          departmentId: bbaDept.id,
          totalAmount: 75000.0,
          status: 'APPROVED',
          items: {
            create: [{ categoryId: consumables.id, amount: 75000.0, justification: 'BBA Study Material' }],
          },
        },
      });

      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      const bbaCard = res.body.data.departments.find((d) => d.code === 'BBA');
      expect(bbaCard).toBeDefined();
      expect(bbaCard.parentCode).toBe('MT');

      // Top-level department has parentCode null
      const etCard = res.body.data.departments.find((d) => d.code === 'ET');
      expect(etCard.parentCode).toBeNull();

      // Clean up BBA budget
      await prisma.budgetItem.deleteMany({ where: { budgetId: bbaBudget.id } });
      await prisma.budget.delete({ where: { id: bbaBudget.id } });
    });

    it('empty list when no approved budget exists in that year', async () => {
      // Create a dummy future financial year with no budgets
      const emptyFy = await prisma.financialYear.create({
        data: {
          year: `FY-EMPTY-${Date.now()}`,
          startDate: new Date('2035-04-01'),
          endDate: new Date('2036-03-31'),
          status: 'OPEN',
          isActive: false,
        },
      });

      const res = await request(app)
        .get(`/api/v1/dashboard/summary?financialYearId=${emptyFy.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.departments).toEqual([]);
      expect(res.body.data.college.allocated).toBe('0.00');
      expect(res.body.data.college.available).toBe('0.00');

      // Clean up
      await prisma.financialYear.delete({ where: { id: emptyFy.id } });
    });
  });

  describe('MVP End-to-End API Cycle on Seed Data', () => {
    it('tracks budget creation, approval, expense draft, submit, approve, pay and reflects Committed, Spent, Available at every step', async () => {
      // We will execute a full cycle on Hotel Management department
      const eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });

      // Clean existing HM data for test determinism
      await prisma.expense.deleteMany({
        where: { financialYearId: activeFy.id, departmentId: hmDept.id },
      });
      await prisma.budgetItem.deleteMany({
        where: { budget: { financialYearId: activeFy.id, departmentId: hmDept.id } },
      });
      await prisma.budget.deleteMany({
        where: { financialYearId: activeFy.id, departmentId: hmDept.id },
      });

      // Step 1: Create and approve a budget for HM of 2,00,000.00
      const budgetRes = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${finToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          totalAmount: 200000.0,
          items: [
            { categoryId: eqCat.id, amount: 200000.0, justification: 'HM Kitchen Equipment' },
          ],
        });
      expect(budgetRes.status).toBe(201);
      const budgetId = budgetRes.body.data.id;

      await request(app)
        .post(`/api/v1/budgets/${budgetId}/submit`)
        .set('Authorization', `Bearer ${finToken}`);

      await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${finToken}`)
        .send({ remark: 'Review HM budget' });

      const appRes = await request(app)
        .post(`/api/v1/budgets/${budgetId}/approve`)
        .set('Authorization', `Bearer ${mgmtToken}`);
      expect(appRes.status).toBe(200);

      // Verify dashboard step 1: Allocated = 200000.00, Committed = 0.00, Spent = 0.00, Available = 200000.00
      let dashRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodHmToken}`);
      let hmCard = dashRes.body.data.departments[0];
      expect(hmCard.allocated).toBe('200000.00');
      expect(hmCard.committed).toBe('0.00');
      expect(hmCard.spent).toBe('0.00');
      expect(hmCard.available).toBe('200000.00');
      expect(hmCard.utilisationPercent).toBe(0);

      // Step 2: STAFF creates DRAFT expense of 50,000.00
      const expDraft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffHmToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          categoryId: eqCat.id,
          amount: 50000.0,
          purpose: 'Commercial oven trays',
        });
      expect(expDraft.status).toBe(201);
      const expenseId = expDraft.body.data.id;

      // Dashboard figures unchanged by DRAFT
      dashRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodHmToken}`);
      hmCard = dashRes.body.data.departments[0];
      expect(hmCard.committed).toBe('0.00');
      expect(hmCard.available).toBe('200000.00');

      // Step 3: STAFF submits DRAFT -> SUBMITTED
      const expSubmit = await request(app)
        .post(`/api/v1/expenses/${expenseId}/submit`)
        .set('Authorization', `Bearer ${staffHmToken}`);
      expect(expSubmit.status).toBe(200);

      // Dashboard figures unchanged by SUBMITTED (money is committed at approval)
      dashRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodHmToken}`);
      hmCard = dashRes.body.data.departments[0];
      expect(hmCard.committed).toBe('0.00');
      expect(hmCard.available).toBe('200000.00');

      // Step 4: HOD approves expense -> APPROVED
      const expApprove = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${hodHmToken}`)
        .send({ remark: 'Approved for kitchen lab' });
      expect(expApprove.status).toBe(200);

      // Dashboard figures: Committed = 50000.00, Spent = 0.00, Available = 150000.00, utilisationPercent = 25
      dashRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodHmToken}`);
      hmCard = dashRes.body.data.departments[0];
      expect(hmCard.allocated).toBe('200000.00');
      expect(hmCard.committed).toBe('50000.00');
      expect(hmCard.spent).toBe('0.00');
      expect(hmCard.available).toBe('150000.00');
      expect(hmCard.utilisationPercent).toBe(25);

      // Step 5: FINANCE marks expense PAID -> PAID
      const expPay = await request(app)
        .post(`/api/v1/expenses/${expenseId}/pay`)
        .set('Authorization', `Bearer ${finToken}`)
        .send({
          paid_on: '2026-10-25',
          payment_mode: 'NEFT',
          payment_ref: 'NEFT-HM-001',
        });
      expect(expPay.status).toBe(200);

      // Dashboard figures: Committed = 0.00, Spent = 50000.00, Available = 150000.00, utilisationPercent = 25
      dashRes = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${hodHmToken}`);
      hmCard = dashRes.body.data.departments[0];
      expect(hmCard.allocated).toBe('200000.00');
      expect(hmCard.committed).toBe('0.00');
      expect(hmCard.spent).toBe('50000.00');
      expect(hmCard.available).toBe('150000.00');
      expect(hmCard.utilisationPercent).toBe(25);

      // Clean up test data
      await prisma.approval.deleteMany({ where: { entityId: expenseId } });
      await prisma.expense.deleteMany({ where: { id: expenseId } });
      await prisma.budgetItem.deleteMany({ where: { budgetId } });
      await prisma.budget.deleteMany({ where: { id: budgetId } });
    }, 30000);
  });
});
