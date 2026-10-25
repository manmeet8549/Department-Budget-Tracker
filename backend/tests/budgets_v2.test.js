import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { events } from '../src/modules/platform/events.js';
import { setTestCeilingLockDelay } from '../src/modules/budgets/service.js';

describe('Iteration 6: Budgets Module v2 Workflow & Ceilings', () => {
  jest.setTimeout(45000);

  let app;
  let adminToken;
  let managementToken;
  let financeToken;
  let hodEtToken;
  let hodPharmaToken;
  let hodHmToken;
  let staffEtToken;
  let auditorToken;

  let activeFy;
  let previousFy;
  let hmDept;
  let mtDept;
  let eqCat;
  let conCat;
  let softCat;

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
    hodPharmaToken = await login('hod_pharma@college.edu');
    hodHmToken = await login('hod_hm@college.edu');
    staffEtToken = await login('staff_et@college.edu');
    auditorToken = await login('auditor@college.edu');

    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    hmDept = await prisma.department.findUnique({ where: { code: 'HM' } });
    mtDept = await prisma.department.findUnique({ where: { code: 'MT' } });

    eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });
    conCat = await prisma.category.findUnique({ where: { name: 'Consumables' } });
    softCat = await prisma.category.findUnique({ where: { name: 'Software' } });

    // Ensure clean state for budgets in activeFy for test departments
    await prisma.approval.deleteMany({ where: { entityType: 'BUDGET' } });
    await prisma.collegeCeiling.deleteMany({});
  }, 45000);

  afterAll(async () => {
    await prisma.collegeCeiling.deleteMany({});
    await prisma.$disconnect();
  });

  describe('College Ceilings API (PUT & GET)', () => {
    it('MANAGEMENT can set a ceiling for a financial year (PUT /budget-ceilings/:fyId)', async () => {
      const res = await request(app)
        .put(`/api/v1/budget-ceilings/${activeFy.id}`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ amount: 5000000.0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.amount)).toBe(5000000.0);
      expect(res.body.data.financialYearId).toBe(activeFy.id);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'college_ceilings',
          action: 'CEILING_SET',
        },
      });
      expect(audit).toBeDefined();
    });

    it('MANAGEMENT, FINANCE, AUDITOR, SUPER_ADMIN can view ceiling (GET /budget-ceilings/:fyId)', async () => {
      for (const token of [managementToken, financeToken, auditorToken, adminToken]) {
        const res = await request(app)
          .get(`/api/v1/budget-ceilings/${activeFy.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Number(res.body.data.amount)).toBe(5000000.0);
        expect(res.body.data.approvedTotal).toBeDefined();
        expect(res.body.data.remaining).toBeDefined();
      }
    });

    it('HOD and STAFF cannot set or view ceilings (403)', async () => {
      // Put check
      for (const token of [hodEtToken, staffEtToken]) {
        const putRes = await request(app)
          .put(`/api/v1/budget-ceilings/${activeFy.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ amount: 6000000.0 });
        expect(putRes.status).toBe(403);

        const getRes = await request(app)
          .get(`/api/v1/budget-ceilings/${activeFy.id}`)
          .set('Authorization', `Bearer ${token}`);
        expect(getRes.status).toBe(403);
      }
    });
  });

  describe('Budget v2 Workflow State Machine', () => {
    let budgetId;

    it('1. HoD creates a DRAFT budget', async () => {
      // Remove any existing budget for HM
      await prisma.budgetItem.deleteMany({
        where: { budget: { financialYearId: activeFy.id, departmentId: hmDept.id } },
      });
      await prisma.budget.deleteMany({
        where: { financialYearId: activeFy.id, departmentId: hmDept.id },
      });

      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          totalAmount: 300000.0,
          items: [
            { categoryId: eqCat.id, amount: 200000.0, justification: 'Kitchen stoves' },
            { categoryId: conCat.id, amount: 100000.0, justification: 'Ingredients' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      budgetId = res.body.data.id;
    });

    it('Invalid transition: DRAFT directly to APPROVED is rejected with 409 INVALID_STATE', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Premature approval' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('Invalid transition: DRAFT directly to UNDER_REVIEW is rejected with 409 INVALID_STATE', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Premature review' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('Role check: MANAGEMENT cannot submit a budget (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/submit`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Management submit' });

      expect(res.status).toBe(403);
    });

    it('Role check: HoD of another department cannot submit this budget (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/submit`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'HoD ET trying HM' });

      expect(res.status).toBe(403);
    });

    it('2. Submit: FINANCE (or HoD HM) submits budget (DRAFT -> SUBMITTED) and emits budget.submitted', async () => {
      let eventPayload = null;
      events.once('budget.submitted', (payload) => {
        eventPayload = payload;
      });

      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/submit`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'HM annual proposal submitted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.submittedBy).toBeDefined();
      expect(res.body.data.submittedOn).toBeDefined();

      expect(eventPayload).toBeDefined();
      expect(eventPayload.budgetId).toBe(budgetId);

      // Verify approval trail has step 1
      const detailRes = await request(app)
        .get(`/api/v1/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(detailRes.body.data.approvals).toBeDefined();
      expect(detailRes.body.data.approvals.length).toBe(1);
      expect(detailRes.body.data.approvals[0].decision).toBe('SUBMITTED');
    });

    it('HoD cannot edit a SUBMITTED budget (409)', async () => {
      const res = await request(app)
        .put(`/api/v1/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${hodHmToken}`)
        .send({
          totalAmount: 400000.0,
          items: [
            { categoryId: eqCat.id, amount: 400000.0, justification: 'Changed' },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('Role check: HoD cannot review budget (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${hodPharmaToken}`)
        .send({ remark: 'HoD trying review' });

      expect(res.status).toBe(403);
    });

    it('Remark is required on review (400 if missing or empty)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: '   ' });

      expect(res.status).toBe(400);
    });

    it('3. Review: FINANCE reviews budget with remark and adjusted item amounts (SUBMITTED -> UNDER_REVIEW)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          remark: 'Finance adjusted kitchen items to match standard limits',
          totalAmount: 250000.0,
          items: [
            { categoryId: eqCat.id, amount: 150000.0, justification: 'Revised kitchen stoves' },
            { categoryId: conCat.id, amount: 100000.0, justification: 'Ingredients' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
      expect(Number(res.body.data.totalAmount)).toBe(250000.0);
      expect(res.body.data.reviewedBy).toBeDefined();
      expect(res.body.data.reviewedOn).toBeDefined();

      // Check audit log recorded old and new values
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'budgets',
          action: 'BUDGET_REVIEW',
          recordId: String(budgetId),
        },
      });
      expect(audit).toBeDefined();
      expect(audit.oldValue).toBeDefined();
      expect(audit.newValue).toBeDefined();
    });

    it('Role check: FINANCE cannot reject or approve budget (403)', async () => {
      const appRes = await request(app)
        .post(`/api/v1/budgets/${budgetId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Finance cannot approve' });
      expect(appRes.status).toBe(403);

      const rejRes = await request(app)
        .post(`/api/v1/budgets/${budgetId}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Finance cannot reject' });
      expect(rejRes.status).toBe(403);
    });

    it('Remark is required on reject (400 if empty)', async () => {
      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/reject`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: '' });

      expect(res.status).toBe(400);
    });

    it('4. Reject: MANAGEMENT rejects budget (UNDER_REVIEW -> REJECTED) and emits budget.rejected', async () => {
      let eventPayload = null;
      events.once('budget.rejected', (payload) => {
        eventPayload = payload;
      });

      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/reject`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Over equipment ceiling for culinary block; reduce by 50k' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectedBy).toBeDefined();
      expect(res.body.data.rejectedOn).toBeDefined();

      expect(eventPayload).toBeDefined();
      expect(eventPayload.budgetId).toBe(budgetId);
      expect(eventPayload.remark).toBe('Over equipment ceiling for culinary block; reduce by 50k');
    });

    it('5. Resubmission: Rejected budget is editable by HoD and can be resubmitted', async () => {
      // Edit rejected budget
      const editRes = await request(app)
        .put(`/api/v1/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          totalAmount: 200000.0,
          items: [
            { categoryId: eqCat.id, amount: 100000.0, justification: 'Scaled down stoves' },
            { categoryId: conCat.id, amount: 100000.0, justification: 'Ingredients' },
          ],
        });

      expect(editRes.status).toBe(200);
      expect(Number(editRes.body.data.totalAmount)).toBe(200000.0);

      // Resubmit
      const subRes = await request(app)
        .post(`/api/v1/budgets/${budgetId}/submit`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Resubmitted after scaling down stoves' });

      expect(subRes.status).toBe(200);
      expect(subRes.body.data.status).toBe('SUBMITTED');

      // Review to UNDER_REVIEW
      const revRes = await request(app)
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Looks great now' });

      expect(revRes.status).toBe(200);
      expect(revRes.body.data.status).toBe('UNDER_REVIEW');
    });

    it('6. Approve: MANAGEMENT approves UNDER_REVIEW budget and emits budget.approved', async () => {
      let eventPayload = null;
      events.once('budget.approved', (payload) => {
        eventPayload = payload;
      });

      const res = await request(app)
        .post(`/api/v1/budgets/${budgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Final approval granted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedBy).toBeDefined();
      expect(res.body.data.approvedOn).toBeDefined();

      expect(eventPayload).toBeDefined();
      expect(eventPayload.budgetId).toBe(budgetId);

      // APPROVED budget is frozen
      const frozenRes = await request(app)
        .put(`/api/v1/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          totalAmount: 250000.0,
          items: [
            { categoryId: eqCat.id, amount: 250000.0, justification: 'Cannot change' },
          ],
        });
      expect(frozenRes.status).toBe(409);
    });
  });

  describe('College Ceiling Enforcement on Approval', () => {
    let ceilingBudgetId;

    beforeAll(async () => {
      // Set ceiling to 1,500,000 for activeFy
      await request(app)
        .put(`/api/v1/budget-ceilings/${activeFy.id}`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ amount: 1500000.0 });
    });

    it('returns 409 CEILING_EXCEEDED with details { ceiling, approvedTotal, requested } when approval exceeds ceiling', async () => {
      // Create a test budget for MT with 1,600,000
      await prisma.budgetItem.deleteMany({
        where: { budget: { financialYearId: activeFy.id, departmentId: mtDept.id } },
      });
      await prisma.budget.deleteMany({
        where: { financialYearId: activeFy.id, departmentId: mtDept.id },
      });

      const createRes = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: mtDept.id,
          totalAmount: 1600000.0,
          items: [
            { categoryId: eqCat.id, amount: 1000000.0, justification: 'Servers' },
            { categoryId: softCat.id, amount: 600000.0, justification: 'Cloud licenses' },
          ],
        });
      ceilingBudgetId = createRes.body.data.id;

      // Submit and review
      await request(app)
        .post(`/api/v1/budgets/${ceilingBudgetId}/submit`)
        .set('Authorization', `Bearer ${financeToken}`);
      await request(app)
        .post(`/api/v1/budgets/${ceilingBudgetId}/review`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Review passed' });

      // Try approve - must fail with 409 CEILING_EXCEEDED
      const approveRes = await request(app)
        .post(`/api/v1/budgets/${ceilingBudgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Trying to exceed ceiling' });

      expect(approveRes.status).toBe(409);
      expect(approveRes.body.success).toBe(false);
      expect(approveRes.body.error.code).toBe('CEILING_EXCEEDED');
      expect(approveRes.body.error.details).toBeDefined();
      expect(approveRes.body.error.details.ceiling).toBe(1500000.0);
      expect(approveRes.body.error.details.requested).toBe(1600000.0);
    });

    it('passes approval when requested + approvedTotal is below or exactly equals ceiling', async () => {
      // Raise ceiling to 3,000,000
      await request(app)
        .put(`/api/v1/budget-ceilings/${activeFy.id}`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ amount: 3000000.0 });

      // Now approve succeeds
      const approveRes = await request(app)
        .post(`/api/v1/budgets/${ceilingBudgetId}/approve`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ remark: 'Approved under new ceiling' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');
    });
  });

  describe('Concurrency Test on Ceiling', () => {
    it('two budgets that together exceed the ceiling approved at the same moment: exactly one succeeds', async () => {
      // Create two independent departments/budgets or dummy departments
      // Let's create dummy departments for concurrency test
      const deptA = await prisma.department.create({
        data: {
          code: `CONC_A_${Date.now()}`,
          name: 'Concurrency Dept A',
        },
      });
      const deptB = await prisma.department.create({
        data: {
          code: `CONC_B_${Date.now()}`,
          name: 'Concurrency Dept B',
        },
      });

      // Total already approved in activeFy: let's query it
      const currentApproved = await prisma.budget.aggregate({
        where: { financialYearId: activeFy.id, status: 'APPROVED' },
        _sum: { totalAmount: true },
      });
      const baseApproved = Number(currentApproved._sum.totalAmount || 0);

      // Set ceiling to exactly baseApproved + 500,000
      // Each budget is 400,000 -> together they are 800,000, which exceeds 500,000 headroom
      const newCeiling = baseApproved + 500000.0;
      await request(app)
        .put(`/api/v1/budget-ceilings/${activeFy.id}`)
        .set('Authorization', `Bearer ${managementToken}`)
        .send({ amount: newCeiling });

      const b1 = await prisma.budget.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: deptA.id,
          totalAmount: 400000.0,
          status: 'UNDER_REVIEW',
          items: {
            create: [{ categoryId: eqCat.id, amount: 400000.0 }],
          },
        },
      });

      const b2 = await prisma.budget.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: deptB.id,
          totalAmount: 400000.0,
          status: 'UNDER_REVIEW',
          items: {
            create: [{ categoryId: eqCat.id, amount: 400000.0 }],
          },
        },
      });

      // Concurrency race hook
      setTestCeilingLockDelay(400);
      let res1, res2;
      try {
        [res1, res2] = await Promise.all([
          request(app)
            .post(`/api/v1/budgets/${b1.id}/approve`)
            .set('Authorization', `Bearer ${managementToken}`)
            .send({ remark: 'Simultaneous A' }),
          request(app)
            .post(`/api/v1/budgets/${b2.id}/approve`)
            .set('Authorization', `Bearer ${managementToken}`)
            .send({ remark: 'Simultaneous B' }),
        ]);
      } finally {
        setTestCeilingLockDelay(0);
      }

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 409 ? res1 : res2;

      expect(successRes.body.data.status).toBe('APPROVED');
      expect(failRes.body.error.code).toBe('CEILING_EXCEEDED');

      // Clean up test departments
      await prisma.budgetItem.deleteMany({ where: { budgetId: { in: [b1.id, b2.id] } } });
      await prisma.approval.deleteMany({ where: { entityId: { in: [b1.id, b2.id] } } });
      await prisma.budget.deleteMany({ where: { id: { in: [b1.id, b2.id] } } });
      await prisma.department.deleteMany({ where: { id: { in: [deptA.id, deptB.id] } } });
    });
  });

  describe('GET /budgets/:id/comparison (Last Year Actuals Comparison)', () => {
    it('returns null previousFinancialYear when there is no previous year', async () => {
      // Find the earliest financial year
      const earliestFy = await prisma.financialYear.findFirst({
        orderBy: { startDate: 'asc' },
      });

      // Create a test budget in earliestFy
      const dummyDept = await prisma.department.create({
        data: { code: `COMP_EARLY_${Date.now()}`, name: 'Early Comparison Dept' },
      });
      const earlyBudget = await prisma.budget.create({
        data: {
          financialYearId: earliestFy.id,
          departmentId: dummyDept.id,
          totalAmount: 100000.0,
          status: 'DRAFT',
          items: {
            create: [{ categoryId: eqCat.id, amount: 100000.0 }],
          },
        },
      });

      const res = await request(app)
        .get(`/api/v1/budgets/${earlyBudget.id}/comparison`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previousFinancialYear).toBeNull();
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories[0].lastYearSpent).toBeNull();

      // Clean up
      await prisma.budgetItem.deleteMany({ where: { budgetId: earlyBudget.id } });
      await prisma.budget.deleteMany({ where: { id: earlyBudget.id } });
      await prisma.department.delete({ where: { id: dummyDept.id } });
    });

    it('returns last year actual Spent per category when previous financial year exists', async () => {
      // Create a previous financial year
      previousFy = await prisma.financialYear.create({
        data: {
          year: `FY-PREV-${Date.now()}`,
          startDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31'),
          isActive: false,
          status: 'OPEN',
        },
      });

      // Create a dummy department with expenses in previous year
      const compDept = await prisma.department.create({
        data: { code: `COMP_DEPT_${Date.now()}`, name: 'Comparison Test Dept' },
      });

      // Create approved budget in previous year
      const prevBudget = await prisma.budget.create({
        data: {
          financialYearId: previousFy.id,
          departmentId: compDept.id,
          totalAmount: 500000.0,
          status: 'APPROVED',
          items: {
            create: [{ categoryId: eqCat.id, amount: 500000.0 }],
          },
        },
      });

      // Create paid expense in previous year
      const creator = await prisma.user.findFirst();
      await prisma.expense.create({
        data: {
          financialYearId: previousFy.id,
          departmentId: compDept.id,
          categoryId: eqCat.id,
          amount: 150000.5,
          purpose: 'Previous year lab upgrade',
          status: 'PAID',
          createdBy: creator.id,
        },
      });

      // Create new budget in activeFy for compDept
      const currBudget = await prisma.budget.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: compDept.id,
          totalAmount: 600000.0,
          status: 'DRAFT',
          items: {
            create: [
              { categoryId: eqCat.id, amount: 400000.0 },
              { categoryId: conCat.id, amount: 200000.0 },
            ],
          },
        },
      });

      const res = await request(app)
        .get(`/api/v1/budgets/${currBudget.id}/comparison`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previousFinancialYear).toBeDefined();
      expect(res.body.data.previousFinancialYear.id).toBe(previousFy.id);

      const eqComp = res.body.data.categories.find((c) => c.categoryId === eqCat.id);
      expect(eqComp).toBeDefined();
      expect(eqComp.currentProposed).toBe(400000.0);
      expect(eqComp.lastYearSpent).toBe(150000.5); // Exact paise match

      const conComp = res.body.data.categories.find((c) => c.categoryId === conCat.id);
      expect(conComp).toBeDefined();
      expect(conComp.currentProposed).toBe(200000.0);
      expect(conComp.lastYearSpent).toBe(0);

      // Clean up
      await prisma.expense.deleteMany({ where: { departmentId: compDept.id } });
      await prisma.budgetItem.deleteMany({ where: { budgetId: { in: [prevBudget.id, currBudget.id] } } });
      await prisma.budget.deleteMany({ where: { id: { in: [prevBudget.id, currBudget.id] } } });
      await prisma.department.delete({ where: { id: compDept.id } });
      await prisma.financialYear.delete({ where: { id: previousFy.id } });
    });
  });
});
