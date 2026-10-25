import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import {
  getDepartmentBalance,
  getCategoryBalances,
  getCollegeBalance,
  getAvailable,
} from '../src/modules/balances/index.js';

describe('Iteration 4a: Balances Module v1', () => {
  jest.setTimeout(30000);

  let app;
  let adminToken;
  let managementToken;
  let financeToken;
  let hodEtToken;
  let staffEtToken;
  let auditorToken;

  let activeFy;
  let etDept;
  let pharmaDept;
  let eqCat;
  let conCat;
  let softCat;
  let superadminUser;

  beforeAll(async () => {
    app = createApp();

    const login = async (email) => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password@123' });
      return res.body.data.accessToken;
    };

    adminToken = await login('superadmin@college.edu');
    managementToken = await login('management@college.edu');
    financeToken = await login('finance@college.edu');
    hodEtToken = await login('hod_et@college.edu');
    staffEtToken = await login('staff_et@college.edu');
    auditorToken = await login('auditor@college.edu');

    superadminUser = await prisma.user.findUnique({ where: { email: 'superadmin@college.edu' } });
    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    etDept = await prisma.department.findUnique({ where: { code: 'ET' } });
    pharmaDept = await prisma.department.findUnique({ where: { code: 'PHARMA' } });
    eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });
    conCat = await prisma.category.findUnique({ where: { name: 'Consumables' } });
    softCat = await prisma.category.findUnique({ where: { name: 'Software' } });

    // Ensure clean budget & expense state for tests
    await prisma.$executeRawUnsafe('DELETE FROM "expenses"');
    await prisma.$executeRawUnsafe('DELETE FROM "budget_items"');
    await prisma.$executeRawUnsafe('DELETE FROM "budgets"');

    // Create an APPROVED budget for ET department:
    // Equipment: 100,000.00
    // Consumables: 50,000.00
    // Total: 150,000.00
    await prisma.budget.create({
      data: {
        financialYearId: activeFy.id,
        departmentId: etDept.id,
        totalAmount: 150000.0,
        status: 'APPROVED',
        approvedBy: superadminUser.id,
        approvedOn: new Date(),
        items: {
          create: [
            { categoryId: eqCat.id, amount: 100000.0, justification: 'Labs' },
            { categoryId: conCat.id, amount: 50000.0, justification: 'Chemicals' },
          ],
        },
      },
      include: { items: true },
    });

    // Create a DRAFT budget for PHARMA department (should NOT count toward Allocated)
    await prisma.budget.create({
      data: {
        financialYearId: activeFy.id,
        departmentId: pharmaDept.id,
        totalAmount: 80000.0,
        status: 'DRAFT',
        items: {
          create: [
            { categoryId: softCat.id, amount: 80000.0, justification: 'Licenses' },
          ],
        },
      },
    });

    // Insert expenses directly in each status for ET department
    // Category Equipment (Allocated = 100,000.00):
    // 1. APPROVED -> 25,000.50 (Committed)
    // 2. PAID     -> 35,000.00 (Spent)
    // 3. DRAFT    -> 10,000.00 (Neither)
    // 4. SUBMITTED-> 5,000.00  (Neither)
    // 5. REJECTED -> 8,000.00  (Neither)
    // 6. CANCELLED-> 7,000.00  (Neither)
    await prisma.expense.createMany({
      data: [
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 25000.5,
          purpose: 'New microscopes (approved)',
          status: 'APPROVED',
          createdBy: superadminUser.id,
        },
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 35000.0,
          purpose: 'Oscilloscopes (paid)',
          status: 'PAID',
          createdBy: superadminUser.id,
        },
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 10000.0,
          purpose: 'Soldering station (draft)',
          status: 'DRAFT',
          createdBy: superadminUser.id,
        },
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 5000.0,
          purpose: 'Breadboards (submitted)',
          status: 'SUBMITTED',
          createdBy: superadminUser.id,
        },
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 8000.0,
          purpose: '3D Printer (rejected)',
          status: 'REJECTED',
          createdBy: superadminUser.id,
        },
        {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 7000.0,
          purpose: 'Laser cutter (cancelled)',
          status: 'CANCELLED',
          createdBy: superadminUser.id,
        },
      ],
    });
  }, 30000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "expenses"');
    await prisma.$executeRawUnsafe('DELETE FROM "budget_items"');
    await prisma.$executeRawUnsafe('DELETE FROM "budgets"');
    await prisma.$disconnect();
  });

  describe('Balance Formulas & Aggregations', () => {
    it('calculates category balance with exact formulas: only APPROVED is Committed, only PAID is Spent', async () => {
      const categoryBalances = await getCategoryBalances(activeFy.id, etDept.id);
      const eqBalance = categoryBalances.find((b) => b.categoryId === eqCat.id);

      expect(eqBalance).toBeDefined();
      expect(Number(eqBalance.allocated)).toBe(100000.0);
      expect(Number(eqBalance.committed)).toBe(25000.5);
      expect(Number(eqBalance.spent)).toBe(35000.0);

      // Available = Allocated - Committed - Spent = 100,000 - 25,000.50 - 35,000 = 39,999.50
      expect(Number(eqBalance.available)).toBe(39999.5);

      // Utilisation % = (Committed + Spent) / Allocated * 100 = 60,000.50 / 100,000 * 100 = 60.00%
      expect(Number(eqBalance.utilisationPercentage)).toBe(60.0);

      // Cross-check: Available + Committed + Spent equals Allocated
      const sum = Number(eqBalance.available) + Number(eqBalance.committed) + Number(eqBalance.spent);
      expect(sum).toBeCloseTo(Number(eqBalance.allocated), 2);
    });

    it('cross-checks that Available + Committed + Spent equals Allocated across all department categories', async () => {
      const categoryBalances = await getCategoryBalances(activeFy.id, etDept.id);
      for (const item of categoryBalances) {
        const sum = Number(item.available) + Number(item.committed) + Number(item.spent);
        expect(sum).toBeCloseTo(Number(item.allocated), 2);
      }
    });

    it('calculates department balance correctly', async () => {
      const deptBalance = await getDepartmentBalance(activeFy.id, etDept.id);

      expect(Number(deptBalance.allocated)).toBe(150000.0);
      expect(Number(deptBalance.committed)).toBe(25000.5);
      expect(Number(deptBalance.spent)).toBe(35000.0);
      expect(Number(deptBalance.available)).toBe(89999.5); // 150000 - 60000.50
      expect(Number(deptBalance.utilisationPercentage)).toBe(40.0); // 60000.50 / 150000 * 100 = 40.00%
    });

    it('handles zero Allocated safely with 0% utilisation and no divide by zero', async () => {
      // Pharma has no APPROVED budget
      const pharmaBalance = await getDepartmentBalance(activeFy.id, pharmaDept.id);

      expect(Number(pharmaBalance.allocated)).toBe(0);
      expect(Number(pharmaBalance.committed)).toBe(0);
      expect(Number(pharmaBalance.spent)).toBe(0);
      expect(Number(pharmaBalance.available)).toBe(0);
      expect(Number(pharmaBalance.utilisationPercentage)).toBe(0);
    });

    it('only APPROVED budgets count toward Allocated (DRAFT budgets do not count)', async () => {
      // Pharma has a DRAFT budget of 80,000, but getDepartmentBalance must return 0 allocated
      const pharmaBalance = await getDepartmentBalance(activeFy.id, pharmaDept.id);
      expect(Number(pharmaBalance.allocated)).toBe(0);
    });

    it('handles exact decimal precision (1,50,000.50) without floating point errors', async () => {
      // Insert another expense of 14,999.50 (paid) to Consumables (Allocated 50,000)
      await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: conCat.id,
          amount: 14999.5,
          purpose: 'Glassware purchase',
          status: 'PAID',
          createdBy: superadminUser.id,
        },
      });

      const conBalances = await getCategoryBalances(activeFy.id, etDept.id);
      const conBal = conBalances.find((b) => b.categoryId === conCat.id);

      expect(Number(conBal.allocated)).toBe(50000.0);
      expect(Number(conBal.spent)).toBe(14999.5);
      expect(Number(conBal.available)).toBe(35000.5);
      expect(Number(conBal.available) + Number(conBal.spent) + Number(conBal.committed)).toBe(50000.0);
    });

    it('calculates getCollegeBalance correctly aggregating all departments with approved budgets', async () => {
      const collegeBalance = await getCollegeBalance(activeFy.id);
      expect(Number(collegeBalance.allocated)).toBe(150000.0);
      expect(Number(collegeBalance.committed)).toBe(25000.5);
      expect(Number(collegeBalance.spent)).toBe(49999.5); // 35000 + 14999.50
      expect(Number(collegeBalance.available)).toBe(75000.0);
      expect(Number(collegeBalance.utilisationPercentage)).toBe(50.0);
    });

    it('getAvailable with lock does not throw inside a transaction', async () => {
      await prisma.$transaction(async (tx) => {
        const available = await getAvailable(tx, activeFy.id, etDept.id, eqCat.id, { lock: true });
        expect(typeof available).toBe('number');
        expect(available).toBe(39999.5);
      });
    });
  });

  describe('Balances HTTP Endpoints & Role Permissions', () => {
    it('scopes GET /balances: HOD can view own department balance', async () => {
      const res = await request(app)
        .get(`/api/v1/balances?departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.allocated)).toBe(150000.0);
    });

    it('scopes GET /balances: prevents HOD from viewing another department balance (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/balances?departmentId=${pharmaDept.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('scopes GET /balances: STAFF can view own department balance', async () => {
      const res = await request(app)
        .get(`/api/v1/balances?departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.allocated)).toBe(150000.0);
    });

    it('scopes GET /balances: prevents STAFF from viewing another department balance (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/balances?departmentId=${pharmaDept.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('scopes GET /balances: MANAGEMENT, FINANCE, AUDITOR, SUPER_ADMIN can view any department or college', async () => {
      for (const token of [managementToken, financeToken, auditorToken, adminToken]) {
        // College balance (no deptId)
        const resCollege = await request(app)
          .get('/api/v1/balances')
          .set('Authorization', `Bearer ${token}`);
        expect(resCollege.status).toBe(200);
        expect(resCollege.body.success).toBe(true);

        // Any dept balance
        const resDept = await request(app)
          .get(`/api/v1/balances?departmentId=${etDept.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(resDept.status).toBe(200);
        expect(resDept.body.success).toBe(true);
      }
    });

    it('scopes GET /balances/:deptId/categories: STAFF and HOD can view own department categories', async () => {
      const resStaff = await request(app)
        .get(`/api/v1/balances/${etDept.id}/categories`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(resStaff.status).toBe(200);
      expect(resStaff.body.success).toBe(true);
      expect(Array.isArray(resStaff.body.data)).toBe(true);
      expect(resStaff.body.data.length).toBeGreaterThan(0);

      const resOtherDept = await request(app)
        .get(`/api/v1/balances/${pharmaDept.id}/categories`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(resOtherDept.status).toBe(403);
    });
  });
});
