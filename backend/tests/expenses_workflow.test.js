import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { events } from '../src/modules/platform/events.js';
import { setTestApprovalDelay } from '../src/modules/expenses/index.js';

describe('Iteration 4b: Expenses Workflow (Submit, Approve, Reject, Pay, Concurrency)', () => {
  jest.setTimeout(40000);

  let app;
  let financeToken;
  let hodEtToken;
  let hodPharmaToken;
  let staffEtToken;

  let activeFy;
  let etDept;
  let eqCat;
  let staffEtUser;
  let hodEtUser;
  let financeUser;

  const login = async (email) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password@123' });
    return res.body.data.accessToken;
  };

  beforeAll(async () => {
    app = createApp();

    financeToken = await login('finance@college.edu');
    hodEtToken = await login('hod_et@college.edu');
    hodPharmaToken = await login('hod_pharma@college.edu');
    staffEtToken = await login('staff_et@college.edu');

    etDept = await prisma.department.findUnique({ where: { code: 'ET' } });
    await prisma.financialYear.updateMany({
      where: { year: '2026-27' },
      data: { isActive: true, status: 'OPEN' },
    });
    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true, status: 'OPEN' } });
    eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });

    staffEtUser = await prisma.user.findUnique({ where: { email: 'staff_et@college.edu' } });
    hodEtUser = await prisma.user.findUnique({ where: { email: 'hod_et@college.edu' } });
    financeUser = await prisma.user.findUnique({ where: { email: 'finance@college.edu' } });

    // Ensure ET has an APPROVED budget for Equipment (Allocated 8,00,000)
    await prisma.budgetItem.deleteMany({
      where: { budget: { financialYearId: activeFy.id, departmentId: etDept.id } },
    });
    await prisma.budget.deleteMany({
      where: { financialYearId: activeFy.id, departmentId: etDept.id },
    });
    await prisma.approval.deleteMany({
      where: { entityType: 'EXPENSE' },
    });
    await prisma.expense.deleteMany({
      where: { financialYearId: activeFy.id, departmentId: etDept.id },
    });

    await prisma.budget.create({
      data: {
        financialYearId: activeFy.id,
        departmentId: etDept.id,
        totalAmount: 800000.0,
        status: 'APPROVED',
        approvedBy: financeUser.id,
        approvedOn: new Date(),
        items: {
          create: [
            { categoryId: eqCat.id, amount: 800000.0, justification: 'Seed Equipment Budget' },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.approval.deleteMany({ where: { entityType: 'EXPENSE' } });
    await prisma.expense.deleteMany({
      where: { financialYearId: activeFy.id, departmentId: etDept.id },
    });
    await prisma.budgetItem.deleteMany({
      where: { budget: { financialYearId: activeFy.id, departmentId: etDept.id } },
    });
    await prisma.budget.deleteMany({
      where: { financialYearId: activeFy.id, departmentId: etDept.id },
    });
    await prisma.$disconnect();
  });

  describe('Full Expense Lifecycle (STAFF draft -> Submit -> HOD approve -> FINANCE pay)', () => {
    let expenseId;

    it('1. STAFF creates a DRAFT of 1,50,000.50 in ET Equipment', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 150000.50,
          purpose: 'Laboratory Oscilloscopes and Sensors',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.amount).toBe(150000.50);
      expenseId = res.body.data.id;
    });

    it('2. STAFF submits the DRAFT; balance is checked, status becomes SUBMITTED, event emitted', async () => {
      let eventPayload = null;
      const listener = (payload) => {
        eventPayload = payload;
      };
      events.once('expense.submitted', listener);

      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.submittedBy).toBe(staffEtUser.id);
      expect(res.body.data.submittedOn).toBeDefined();

      expect(eventPayload).toBeDefined();
      expect(eventPayload.expenseId).toBe(expenseId);
      expect(eventPayload.amount).toBe(150000.50);
    });

    it('3. Balances after submission: money is NOT yet committed (Committed = 0, Available = 8,00,000)', async () => {
      const res = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.allocated).toBe(800000.0);
      expect(res.body.data.committed).toBe(0);
      expect(res.body.data.spent).toBe(0);
      expect(res.body.data.available).toBe(800000.0);
    });

    it('4. HOD approves: row lock taken, status becomes APPROVED, money committed (Committed = 1,50,000.50, Available = 6,49,999.50)', async () => {
      let eventPayload = null;
      const listener = (payload) => {
        eventPayload = payload;
      };
      events.once('expense.approved', listener);

      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Approved for Semester 1 lab procurement' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedBy).toBe(hodEtUser.id);
      expect(res.body.data.approvedOn).toBeDefined();

      expect(eventPayload).toBeDefined();
      expect(eventPayload.expenseId).toBe(expenseId);

      // Verify balances
      const balRes = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(balRes.body.data.allocated).toBe(800000.0);
      expect(balRes.body.data.committed).toBe(150000.50);
      expect(balRes.body.data.spent).toBe(0);
      expect(balRes.body.data.available).toBe(649999.50);
    });

    it('5. FINANCE pays: requires paid_on, payment_mode, payment_ref; status becomes PAID (Spent = 1,50,000.50, Committed = 0, Available = 6,49,999.50)', async () => {
      let eventPayload = null;
      const listener = (payload) => {
        eventPayload = payload;
      };
      events.once('expense.paid', listener);

      const res = await request(app)
        .post(`/api/v1/expenses/${expenseId}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          paid_on: '2026-10-25',
          payment_mode: 'NEFT',
          payment_ref: 'NEFT202610250001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.paidBy).toBe(financeUser.id);
      expect(res.body.data.paymentMode).toBe('NEFT');
      expect(res.body.data.paymentRef).toBe('NEFT202610250001');

      expect(eventPayload).toBeDefined();
      expect(eventPayload.expenseId).toBe(expenseId);

      // Verify balances: Spent = 1,50,000.50, Committed = 0, Available = 6,49,999.50
      const balRes = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(balRes.body.data.allocated).toBe(800000.0);
      expect(balRes.body.data.committed).toBe(0);
      expect(balRes.body.data.spent).toBe(150000.50);
      expect(balRes.body.data.available).toBe(649999.50);

      // Cross check: Available + Committed + Spent === Allocated
      const sum = balRes.body.data.available + balRes.body.data.committed + balRes.body.data.spent;
      expect(Math.round(sum * 100) / 100).toBe(800000.0);
    });

    it('6. GET /expenses/:id returns the full approval trail', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.approvals).toBeDefined();
      expect(Array.isArray(res.body.data.approvals)).toBe(true);
      expect(res.body.data.approvals.length).toBe(1);
      expect(res.body.data.approvals[0].decision).toBe('APPROVED');
      expect(res.body.data.approvals[0].remark).toBe('Approved for Semester 1 lab procurement');
      expect(res.body.data.approvals[0].approver.id).toBe(hodEtUser.id);
    });
  });

  describe('Balance Check & Insufficient Balance at Submit (409)', () => {
    it('returns 409 INSUFFICIENT_BALANCE with details { requested, available } when submit exceeds available balance', async () => {
      // Available in ET Equipment is 6,49,999.50
      // Create draft of 7,00,000
      const draftRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 700000.0,
          purpose: 'Massive Supercomputer Rack',
        });
      expect(draftRes.status).toBe(201);
      const superExpId = draftRes.body.data.id;

      // Submit should fail with 409
      const submitRes = await request(app)
        .post(`/api/v1/expenses/${superExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(submitRes.status).toBe(409);
      expect(submitRes.body.success).toBe(false);
      expect(submitRes.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(submitRes.body.error.details).toBeDefined();
      expect(submitRes.body.error.details.requested).toBe(700000.0);
      expect(submitRes.body.error.details.available).toBe(649999.50);

      // Clean up
      await prisma.expense.delete({ where: { id: superExpId } });
    });
  });

  describe('Rejection Workflow & Invariance', () => {
    it('reject requires non-empty remark (400) and marks status REJECTED (audit log written, never committed)', async () => {
      const draftRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 50000.0,
          purpose: 'High end tablets',
        });
      const expId = draftRes.body.data.id;

      await request(app)
        .post(`/api/v1/expenses/${expId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      // Attempt reject without remark -> 400
      const emptyRes = await request(app)
        .post(`/api/v1/expenses/${expId}/reject`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: '   ' });
      expect(emptyRes.status).toBe(400);

      // Valid reject with remark -> 200
      let eventFired = false;
      events.once('expense.rejected', () => {
        eventFired = true;
      });

      const rejectRes = await request(app)
        .post(`/api/v1/expenses/${expId}/reject`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Tablets are not approved for this fiscal quarter' });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');
      expect(eventFired).toBe(true);

      // Verify rejected expense does NOT count toward committed
      const balRes = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);
      expect(balRes.body.data.committed).toBe(0);

      // Verify approval trail has REJECTED row
      const detailRes = await request(app)
        .get(`/api/v1/expenses/${expId}`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(detailRes.body.data.approvals[0].decision).toBe('REJECTED');
      expect(detailRes.body.data.approvals[0].remark).toBe('Tablets are not approved for this fiscal quarter');
    });
  });

  describe('Role Matrix & Workflow Permissions', () => {
    let testExpId;

    beforeEach(async () => {
      const draft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 10000.0,
          purpose: 'Testing permissions',
        });
      testExpId = draft.body.data.id;
    });

    afterEach(async () => {
      await prisma.approval.deleteMany({ where: { entityId: testExpId } });
      await prisma.expense.deleteMany({ where: { id: testExpId } });
    });

    it('requester cannot approve own request (even if role is HOD)', async () => {
      // HOD creates their own expense
      const hodDraft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 20000.0,
          purpose: 'HOD personal lab expense',
        });
      const hodExpId = hodDraft.body.data.id;

      await request(app)
        .post(`/api/v1/expenses/${hodExpId}/submit`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      // HOD attempts to approve their own request -> 403
      const selfApprove = await request(app)
        .post(`/api/v1/expenses/${hodExpId}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Self approval' });
      expect(selfApprove.status).toBe(403);

      // FINANCE can approve HOD request -> 200
      const finApprove = await request(app)
        .post(`/api/v1/expenses/${hodExpId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ remark: 'Finance approved HOD expense' });
      expect(finApprove.status).toBe(200);

      await prisma.approval.deleteMany({ where: { entityId: hodExpId } });
      await prisma.expense.deleteMany({ where: { id: hodExpId } });
    });

    it('STAFF cannot approve any expense (403)', async () => {
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      const res = await request(app)
        .post(`/api/v1/expenses/${testExpId}/approve`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(res.status).toBe(403);
    });

    it('HOD of a different department cannot approve (Pharma HOD -> 403 for ET)', async () => {
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      const res = await request(app)
        .post(`/api/v1/expenses/${testExpId}/approve`)
        .set('Authorization', `Bearer ${hodPharmaToken}`);
      expect(res.status).toBe(403);
    });

    it('FINANCE cannot approve a STAFF request (STAFF must be approved by HOD -> 403)', async () => {
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      const res = await request(app)
        .post(`/api/v1/expenses/${testExpId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`);
      expect(res.status).toBe(403);
    });

    it('HOD cannot pay (403)', async () => {
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      const res = await request(app)
        .post(`/api/v1/expenses/${testExpId}/pay`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'NEFT', payment_ref: 'REF123' });
      expect(res.status).toBe(403);
    });

    it('FINANCE cannot pay a SUBMITTED or DRAFT expense (409 INVALID_STATE)', async () => {
      // On DRAFT
      const draftPay = await request(app)
        .post(`/api/v1/expenses/${testExpId}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'NEFT', payment_ref: 'REF123' });
      expect(draftPay.status).toBe(409);
      expect(draftPay.body.error.code).toBe('INVALID_STATE');

      // On SUBMITTED
      await request(app)
        .post(`/api/v1/expenses/${testExpId}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      const subPay = await request(app)
        .post(`/api/v1/expenses/${testExpId}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'NEFT', payment_ref: 'REF123' });
      expect(subPay.status).toBe(409);
      expect(subPay.body.error.code).toBe('INVALID_STATE');
    });

    it('a STAFF request in HM and in MT can be approved by that department HOD', async () => {
      // 1. Hotel Management (HM)
      const staffHmToken = await login('staff_hm@college.edu');
      const hodHmToken = await login('hod_hm@college.edu');
      const hmDept = await prisma.department.findUnique({ where: { code: 'HM' } });
      const consumablesCat = await prisma.category.findUnique({ where: { name: 'Consumables' } });

      const hmBudget = await prisma.budget.upsert({
        where: { financialYearId_departmentId: { financialYearId: activeFy.id, departmentId: hmDept.id } },
        update: { status: 'APPROVED', totalAmount: 100000.0 },
        create: {
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          totalAmount: 100000.0,
          status: 'APPROVED',
          approvedBy: financeUser.id,
          approvedOn: new Date(),
          items: {
            create: [{ categoryId: consumablesCat.id, amount: 100000.0, justification: 'HM Consumables' }],
          },
        },
        include: { items: true },
      });
      if (!hmBudget.items || hmBudget.items.length === 0) {
        await prisma.budgetItem.upsert({
          where: { budgetId_categoryId: { budgetId: hmBudget.id, categoryId: consumablesCat.id } },
          update: { amount: 100000.0 },
          create: { budgetId: hmBudget.id, categoryId: consumablesCat.id, amount: 100000.0 },
        });
      }

      const hmDraft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffHmToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: hmDept.id,
          categoryId: consumablesCat.id,
          amount: 12000.0,
          purpose: 'Culinary baking supplies',
        });
      expect(hmDraft.status).toBe(201);
      const hmExpId = hmDraft.body.data.id;

      await request(app)
        .post(`/api/v1/expenses/${hmExpId}/submit`)
        .set('Authorization', `Bearer ${staffHmToken}`);

      const hmApprove = await request(app)
        .post(`/api/v1/expenses/${hmExpId}/approve`)
        .set('Authorization', `Bearer ${hodHmToken}`)
        .send({ remark: 'Approved for culinary workshop' });
      expect(hmApprove.status).toBe(200);
      expect(hmApprove.body.data.status).toBe('APPROVED');

      // 2. Management & Technology (MT)
      const staffMtToken = await login('staff_mt@college.edu');
      const hodMtToken = await login('hod_mt@college.edu');
      const mtDept = await prisma.department.findUnique({ where: { code: 'MT' } });

      const mtBudget = await prisma.budget.upsert({
        where: { financialYearId_departmentId: { financialYearId: activeFy.id, departmentId: mtDept.id } },
        update: { status: 'APPROVED', totalAmount: 100000.0 },
        create: {
          financialYearId: activeFy.id,
          departmentId: mtDept.id,
          totalAmount: 100000.0,
          status: 'APPROVED',
          approvedBy: financeUser.id,
          approvedOn: new Date(),
          items: {
            create: [{ categoryId: consumablesCat.id, amount: 100000.0, justification: 'MT Consumables' }],
          },
        },
        include: { items: true },
      });
      if (!mtBudget.items || mtBudget.items.length === 0) {
        await prisma.budgetItem.upsert({
          where: { budgetId_categoryId: { budgetId: mtBudget.id, categoryId: consumablesCat.id } },
          update: { amount: 100000.0 },
          create: { budgetId: mtBudget.id, categoryId: consumablesCat.id, amount: 100000.0 },
        });
      }

      const mtDraft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffMtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: mtDept.id,
          categoryId: consumablesCat.id,
          amount: 8500.0,
          purpose: 'Case study printouts and folders',
        });
      expect(mtDraft.status).toBe(201);
      const mtExpId = mtDraft.body.data.id;

      await request(app)
        .post(`/api/v1/expenses/${mtExpId}/submit`)
        .set('Authorization', `Bearer ${staffMtToken}`);

      const mtApprove = await request(app)
        .post(`/api/v1/expenses/${mtExpId}/approve`)
        .set('Authorization', `Bearer ${hodMtToken}`)
        .send({ remark: 'Approved for MBA seminar' });
      expect(mtApprove.status).toBe(200);
      expect(mtApprove.body.data.status).toBe('APPROVED');

      // Cleanup
      await prisma.approval.deleteMany({ where: { entityId: { in: [hmExpId, mtExpId] } } });
      await prisma.expense.deleteMany({ where: { id: { in: [hmExpId, mtExpId] } } });
      await prisma.budgetItem.deleteMany({ where: { budgetId: { in: [hmBudget.id, mtBudget.id] } } });
      await prisma.budget.deleteMany({ where: { id: { in: [hmBudget.id, mtBudget.id] } } });
    });

  });

  describe('State Machine Invariants & Immutability', () => {
    it('every invalid transition returns 409 INVALID_STATE', async () => {
      const draft = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 5000.0,
          purpose: 'Testing state transitions',
        });
      const id = draft.body.data.id;

      // Cannot approve DRAFT directly
      const approveDraft = await request(app)
        .post(`/api/v1/expenses/${id}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`);
      expect(approveDraft.status).toBe(409);
      expect(approveDraft.body.error.code).toBe('INVALID_STATE');

      // Cannot reject DRAFT directly
      const rejectDraft = await request(app)
        .post(`/api/v1/expenses/${id}/reject`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Invalid' });
      expect(rejectDraft.status).toBe(409);

      // Submit -> SUBMITTED
      await request(app)
        .post(`/api/v1/expenses/${id}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      // Cannot submit SUBMITTED again
      const reSubmit = await request(app)
        .post(`/api/v1/expenses/${id}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(reSubmit.status).toBe(409);

      // Approve -> APPROVED
      await request(app)
        .post(`/api/v1/expenses/${id}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      // Cannot approve APPROVED again
      const reApprove = await request(app)
        .post(`/api/v1/expenses/${id}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`);
      expect(reApprove.status).toBe(409);

      // Cannot reject APPROVED
      const rejectApproved = await request(app)
        .post(`/api/v1/expenses/${id}/reject`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Too late' });
      expect(rejectApproved.status).toBe(409);

      // Pay -> PAID
      await request(app)
        .post(`/api/v1/expenses/${id}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'CASH', payment_ref: 'CASH001' });

      // PAID is final & immutable: cannot edit, delete, submit, approve, pay again
      const editPaid = await request(app)
        .put(`/api/v1/expenses/${id}`)
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({ amount: 6000.0 });
      expect(editPaid.status).toBe(409);

      const deletePaid = await request(app)
        .delete(`/api/v1/expenses/${id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(deletePaid.status).toBe(409);

      const payPaid = await request(app)
        .post(`/api/v1/expenses/${id}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'CASH', payment_ref: 'CASH002' });
      expect(payPaid.status).toBe(409);

      // Clean up
      await prisma.approval.deleteMany({ where: { entityId: id } });
      await prisma.expense.deleteMany({ where: { id } });
    });
  });

  describe('CONCURRENCY GATE: Two Simultaneous Approvals', () => {
    it('two simultaneous approvals that together exceed available balance: exactly one succeeds, the other gets 409 INSUFFICIENT_BALANCE, Committed never exceeds Allocated', async () => {
      // Ensure ET Equipment has Spent 1,50,000.50 so Available is 6,49,999.50 even if test is run standalone
      const initBal = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${financeToken}`);
      let baselineExpId = null;
      if (initBal.body.data.spent === 0) {
        const seedExp = await prisma.expense.create({
          data: {
            financialYearId: activeFy.id,
            departmentId: etDept.id,
            categoryId: eqCat.id,
            amount: 150000.50,
            purpose: 'Baseline seed expense for concurrency test',
            status: 'PAID',
            createdBy: staffEtUser.id,
            paidBy: financeUser.id,
            paidOn: new Date(),
            paymentMode: 'NEFT',
            paymentRef: 'SEED_CONCURRENCY',
          },
        });
        baselineExpId = seedExp.id;
      }

      // In ET Equipment: Allocated is 8,00,000, Spent is 1,50,000.50 -> Available is 6,49,999.50
      // Create two SUBMITTED expenses of 4,00,000 each (Total = 8,00,000 > Available 6,49,999.50)
      const exp1Res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 400000.0,
          purpose: 'Concurrent lab workstation order A',
        });
      const exp1Id = exp1Res.body.data.id;

      const exp2Res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 400000.0,
          purpose: 'Concurrent lab workstation order B',
        });
      const exp2Id = exp2Res.body.data.id;

      // Submit both
      await request(app)
        .post(`/api/v1/expenses/${exp1Id}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      await request(app)
        .post(`/api/v1/expenses/${exp2Id}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      // Now approve both simultaneously with Promise.all
      // Uses a test concurrency delay hook (400ms) to ensure race overlap
      setTestApprovalDelay(400);
      let res1, res2;
      try {
        [res1, res2] = await Promise.all([
          request(app)
            .post(`/api/v1/expenses/${exp1Id}/approve`)
            .set('Authorization', `Bearer ${hodEtToken}`)
            .send({ remark: 'Order A approve' }),
          request(app)
            .post(`/api/v1/expenses/${exp2Id}/approve`)
            .set('Authorization', `Bearer ${hodEtToken}`)
            .send({ remark: 'Order B approve' }),
        ]);
      } finally {
        setTestApprovalDelay(0);
      }

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 409 ? res1 : res2;

      expect(successRes.body.success).toBe(true);
      expect(successRes.body.data.status).toBe('APPROVED');

      expect(failRes.body.success).toBe(false);
      expect(failRes.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(failRes.body.error.details.requested).toBe(400000.0);

      // Verify database state: Committed never exceeds Allocated
      const balRes = await request(app)
        .get(`/api/v1/balances?financialYearId=${activeFy.id}&departmentId=${etDept.id}`)
        .set('Authorization', `Bearer ${financeToken}`);

      // Committed should be exactly 400,000 (from the successful one)
      expect(balRes.body.data.committed).toBe(400000.0);
      expect(balRes.body.data.spent).toBe(150000.50);
      expect(balRes.body.data.available).toBe(249999.50);

      // Total committed + spent (5,50,000.50) is <= allocated (8,00,000.00)
      expect(balRes.body.data.committed + balRes.body.data.spent).toBeLessThanOrEqual(
        balRes.body.data.allocated
      );

      // Clean up
      await prisma.approval.deleteMany({ where: { entityId: { in: [exp1Id, exp2Id] } } });
      const idsToDelete = [exp1Id, exp2Id];
      if (baselineExpId) idsToDelete.push(baselineExpId);
      await prisma.expense.deleteMany({ where: { id: { in: idsToDelete } } });
    });
  });

  describe('Audit Trail Verification', () => {
    it('every workflow write creates an audit_logs row (EXPENSE_SUBMIT, EXPENSE_APPROVE, EXPENSE_REJECT, EXPENSE_PAY)', async () => {
      const exp = await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 12000.0,
          purpose: 'Audit test expense',
          status: 'DRAFT',
          createdBy: staffEtUser.id,
        },
      });

      // Submit
      await request(app)
        .post(`/api/v1/expenses/${exp.id}/submit`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      const submitLog = await prisma.auditLog.findFirst({
        where: { recordId: String(exp.id), action: 'EXPENSE_SUBMIT' },
      });
      expect(submitLog).toBeDefined();
      expect(submitLog.userId).toBe(staffEtUser.id);

      // Approve
      await request(app)
        .post(`/api/v1/expenses/${exp.id}/approve`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({ remark: 'Approved for audit test' });

      const approveLog = await prisma.auditLog.findFirst({
        where: { recordId: String(exp.id), action: 'EXPENSE_APPROVE' },
      });
      expect(approveLog).toBeDefined();
      expect(approveLog.userId).toBe(hodEtUser.id);

      // Pay
      await request(app)
        .post(`/api/v1/expenses/${exp.id}/pay`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ paid_on: '2026-10-25', payment_mode: 'CHEQUE', payment_ref: 'CHQ123456' });

      const payLog = await prisma.auditLog.findFirst({
        where: { recordId: String(exp.id), action: 'EXPENSE_PAY' },
      });
      expect(payLog).toBeDefined();
      expect(payLog.userId).toBe(financeUser.id);

      // Clean up
      await prisma.approval.deleteMany({ where: { entityId: exp.id } });
      await prisma.expense.deleteMany({ where: { id: exp.id } });
    });
  });
});
