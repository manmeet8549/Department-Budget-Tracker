import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { events } from '../src/modules/platform/events.js';
import { assertBudgetUsable } from '../src/modules/budgets/index.js';

describe('Iteration 3: Budgets Module v1', () => {
  jest.setTimeout(30000);

  let app;
  let adminToken;
  let managementToken;
  let financeToken;
  let hodEtToken;
  let hodPharmaToken;
  let staffEtToken;
  let auditorToken;

  let activeFy;
  let etDept;
  let pharmaDept;
  let eqCat;
  let conCat;
  let softCat;

  beforeAll(async () => {
    app = createApp();

    // Logins for role tokens
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
    hodPharmaToken = await login('hod_pharma@college.edu');
    staffEtToken = await login('staff_et@college.edu');
    auditorToken = await login('auditor@college.edu');

    // Retrieve active FY and test departments / categories
    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    etDept = await prisma.department.findUnique({ where: { code: 'ET' } });
    pharmaDept = await prisma.department.findUnique({ where: { code: 'PHARMA' } });
    eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });
    conCat = await prisma.category.findUnique({ where: { name: 'Consumables' } });
    softCat = await prisma.category.findUnique({ where: { name: 'Software' } });
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Validation & Business Rules', () => {
    it('rejects budget when sum of items does not equal total_amount', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 100000,
          items: [
            { categoryId: eqCat.id, amount: 40000, justification: 'Machines' },
            { categoryId: conCat.id, amount: 50000, justification: 'Supplies' }, // sum = 90000 !== 100000
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate categories within a single budget', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 100000,
          items: [
            { categoryId: eqCat.id, amount: 50000, justification: 'Part 1' },
            { categoryId: eqCat.id, amount: 50000, justification: 'Part 2' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects zero or negative amounts', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 0,
          items: [
            { categoryId: eqCat.id, amount: -100, justification: 'Invalid' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects inactive category or inactive department', async () => {
      // Create an inactive category
      const inactiveCat = await prisma.category.create({
        data: { name: `Inactive-${Date.now()}`, isActive: false },
      });

      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 50000,
          items: [
            { categoryId: inactiveCat.id, amount: 50000, justification: 'Inactive item' },
          ],
        });

      expect([400, 409]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('creating a budget for a financial year that is not active or not OPEN is rejected', async () => {
      // Create an inactive FY
      const inactiveFy = await prisma.financialYear.create({
        data: {
          year: `FY-INACT-${Date.now()}`,
          startDate: new Date('2028-04-01'),
          endDate: new Date('2029-03-31'),
          isActive: false,
          status: 'OPEN',
        },
      });

      const resInactive = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: inactiveFy.id,
          departmentId: etDept.id,
          totalAmount: 50000,
          items: [{ categoryId: eqCat.id, amount: 50000, justification: 'Inactive FY' }],
        });

      expect(resInactive.status).toBe(400);
      expect(resInactive.body.success).toBe(false);
      expect(resInactive.body.error.code).toBe('INVALID_FINANCIAL_YEAR');

      // Create a closed FY
      const closedFy = await prisma.financialYear.create({
        data: {
          year: `FY-CLOSED-${Date.now()}`,
          startDate: new Date('2029-04-01'),
          endDate: new Date('2030-03-31'),
          isActive: false,
          status: 'CLOSED',
        },
      });

      const resClosed = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: closedFy.id,
          departmentId: etDept.id,
          totalAmount: 50000,
          items: [{ categoryId: eqCat.id, amount: 50000, justification: 'Closed FY' }],
        });

      expect(resClosed.status).toBe(400);
      expect(resClosed.body.success).toBe(false);
      expect(resClosed.body.error.code).toBe('INVALID_FINANCIAL_YEAR');
    });

    it('stores and returns exact decimal precision like 1,50,000.50 (NUMERIC 14,2)', async () => {
      // Finance creates for HM
      const hmDept = await prisma.department.findUnique({ where: { code: 'HM' } });
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          totalAmount: 150000.5,
          items: [
            { categoryId: eqCat.id, amount: 100000.25, justification: 'Precision 1' },
            { categoryId: conCat.id, amount: 50000.25, justification: 'Precision 2' },
          ],
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.totalAmount)).toBe(150000.5);
      expect(Number(res.body.data.items[0].amount)).toBe(100000.25);
      expect(Number(res.body.data.items[1].amount)).toBe(50000.25);
    });
  });

  describe('Department Scoping & Permissions', () => {
    it('prevents HOD from creating a budget for another department (403)', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: pharmaDept.id, // HoD ET cannot create for PHARMA
          totalAmount: 100000,
          items: [
            { categoryId: eqCat.id, amount: 100000, justification: 'Cross dept' },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows HOD to create a DRAFT budget for their own department', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 200000,
          items: [
            { categoryId: eqCat.id, amount: 120000, justification: 'Lab equipment' },
            { categoryId: softCat.id, amount: 80000, justification: 'CAD Licenses' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.departmentId).toBe(etDept.id);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'budgets',
          action: 'BUDGET_CREATE',
          recordId: String(res.body.data.id),
        },
      });
      expect(audit).toBeDefined();
    });

    it('rejects duplicate budget for same department and year with 409', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          totalAmount: 300000,
          items: [
            { categoryId: eqCat.id, amount: 300000, justification: 'Duplicate' },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('HOD cannot view another department budget details (403)', async () => {
      // Find budget of HM department
      const hmDept = await prisma.department.findUnique({ where: { code: 'HM' } });
      const hmBudget = await prisma.budget.findFirst({ where: { departmentId: hmDept.id } });

      const res = await request(app)
        .get(`/api/v1/budgets/${hmBudget.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Management Approval & Freezing', () => {
    let createdBudgetId;

    beforeAll(async () => {
      // Create a DRAFT budget for Pharma by Finance
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: pharmaDept.id,
          totalAmount: 500000,
          items: [
            { categoryId: conCat.id, amount: 300000, justification: 'Chemicals' },
            { categoryId: eqCat.id, amount: 200000, justification: 'Centrifuges' },
          ],
        });
      createdBudgetId = res.body.data.id;
    });

    it('prevents HOD, STAFF, and AUDITOR from approving a budget (403)', async () => {
      for (const token of [hodEtToken, staffEtToken, auditorToken]) {
        const res = await request(app)
          .post(`/api/v1/budgets/${createdBudgetId}/approve`)
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
      }
    });

    it('allows MANAGEMENT to approve an UNDER_REVIEW budget, fires budget.approved event, and writes audit log', async () => {
      // Transition DRAFT -> SUBMITTED -> UNDER_REVIEW
      await request(app)
        .post(`/api/v1/budgets/${createdBudgetId}/submit`)
        .set('Authorization', `Bearer ${financeToken}`);

      await request(app)
        .post(`/api/v1/budgets/${createdBudgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Finance review complete' });

      let eventPayload = null;
      events.once('budget.approved', (payload) => {
        eventPayload = payload;
      });

      const res = await request(app)
        .post(`/api/v1/budgets/${createdBudgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedBy).toBeDefined();
      expect(res.body.data.approvedOn).toBeDefined();

      // Verify event was emitted
      expect(eventPayload).toBeDefined();
      expect(eventPayload.budgetId).toBe(createdBudgetId);
      expect(Number(eventPayload.totalAmount)).toBe(500000);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'budgets',
          action: 'BUDGET_APPROVE',
          recordId: String(createdBudgetId),
        },
      });
      expect(audit).toBeDefined();
    });

    it('freezes APPROVED budget: rejects edit with 409', async () => {
      const res = await request(app)
        .put(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          totalAmount: 600000,
          items: [
            { categoryId: conCat.id, amount: 600000, justification: 'More chemicals' },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('approving an already-approved budget returns 409', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${createdBudgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(['INVALID_STATUS', 'INVALID_STATE']).toContain(res.body.error.code);
    });
  });

  describe('Role Matrix & List Scoping', () => {
    it('scopes GET /budgets: HOD sees only their department', async () => {
      const res = await request(app)
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned budgets must belong to ET
      for (const b of res.body.data) {
        expect(b.departmentId).toBe(etDept.id);
      }
    });

    it('scopes GET /budgets: MANAGEMENT and SUPER_ADMIN see all departments', async () => {
      const resMgmt = await request(app)
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${managementToken}`);
      expect(resMgmt.status).toBe(200);
      const mgmtDeptIds = new Set(resMgmt.body.data.map((b) => b.departmentId));
      expect(mgmtDeptIds.size).toBeGreaterThan(1);

      const resAdmin = await request(app)
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);
      const adminDeptIds = new Set(resAdmin.body.data.map((b) => b.departmentId));
      expect(adminDeptIds.size).toBeGreaterThan(1);
    });

    it('scopes GET /budgets: HOD Pharma sees only Pharma department', async () => {
      const res = await request(app)
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${hodPharmaToken}`);

      expect(res.status).toBe(200);
      for (const b of res.body.data) {
        expect(b.departmentId).toBe(pharmaDept.id);
      }
    });
  });

  describe('assertBudgetUsable contract helper', () => {
    it('returns usable budget (truthy) only for an APPROVED budget in an active, open year', async () => {
      // pharmaDept has the approved budget in activeFy
      const usable = await assertBudgetUsable(activeFy.id, pharmaDept.id);
      expect(usable).toBeDefined();
      expect(usable.status).toBe('APPROVED');
      expect(usable.financialYear.status).toBe('OPEN');
      expect(usable.financialYear.isActive).toBe(true);

      // DRAFT budget (etDept) throws 409 BUDGET_NOT_APPROVED
      await expect(assertBudgetUsable(activeFy.id, etDept.id)).rejects.toMatchObject({
        status: 409,
        code: 'BUDGET_NOT_APPROVED',
      });

      // Non-existent budget throws 404 BUDGET_NOT_FOUND
      await expect(assertBudgetUsable(activeFy.id, 99999)).rejects.toMatchObject({
        status: 404,
        code: 'BUDGET_NOT_FOUND',
      });

      // Budget in an inactive financial year throws 409
      const inactiveYear = await prisma.financialYear.create({
        data: {
          year: `FY-INACT-USABLE-${Date.now()}`,
          startDate: new Date('2031-04-01'),
          endDate: new Date('2032-03-31'),
          isActive: false,
          status: 'OPEN',
        },
      });
      const mtDept = await prisma.department.findUnique({ where: { code: 'MT' } });
      await prisma.budget.create({
        data: {
          financialYearId: inactiveYear.id,
          departmentId: mtDept.id,
          totalAmount: 100000,
          status: 'APPROVED',
        },
      });
      await expect(assertBudgetUsable(inactiveYear.id, mtDept.id)).rejects.toMatchObject({
        status: 409,
        code: 'FINANCIAL_YEAR_INACTIVE',
      });
    });
  });
});
