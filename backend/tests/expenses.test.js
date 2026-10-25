import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Iteration 4a: Expenses Module v1 (Part 1)', () => {
  jest.setTimeout(30000);

  let app;
  let adminToken;
  let managementToken;
  let financeToken;
  let hodEtToken;
  let hodPharmaToken;
  let staffEtToken;
  let staffPharmaToken;
  let auditorToken;

  let activeFy;
  let closedFy;
  let etDept;
  let pharmaDept;
  let inactiveDept;
  let eqCat;
  let inactiveCat;
  let superadminUser;
  let staffEtUser;

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
    staffEtToken = await login('staff_et@college.edu');

    pharmaDept = await prisma.department.findUnique({ where: { code: 'PHARMA' } });
    const superUser = await prisma.user.findUnique({ where: { email: 'superadmin@college.edu' } });
    await prisma.user.upsert({
      where: { email: 'staff_pharma@college.edu' },
      update: {},
      create: {
        email: 'staff_pharma@college.edu',
        name: 'Staff Pharma',
        role: 'STAFF',
        departmentId: pharmaDept.id,
        passwordHash: superUser.passwordHash,
        isActive: true,
      },
    });

    staffPharmaToken = await login('staff_pharma@college.edu');
    auditorToken = await login('auditor@college.edu');

    superadminUser = await prisma.user.findUnique({ where: { email: 'superadmin@college.edu' } });
    staffEtUser = await prisma.user.findUnique({ where: { email: 'staff_et@college.edu' } });

    activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
    etDept = await prisma.department.findUnique({ where: { code: 'ET' } });
    pharmaDept = await prisma.department.findUnique({ where: { code: 'PHARMA' } });
    eqCat = await prisma.category.findUnique({ where: { name: 'Equipment' } });

    // Clean up expenses, budget items, budgets
    await prisma.$executeRawUnsafe('DELETE FROM "expenses"');
    await prisma.$executeRawUnsafe('DELETE FROM "budget_items"');
    await prisma.$executeRawUnsafe('DELETE FROM "budgets"');

    // Create an APPROVED budget for ET
    await prisma.budget.create({
      data: {
        financialYearId: activeFy.id,
        departmentId: etDept.id,
        totalAmount: 200000.0,
        status: 'APPROVED',
        approvedBy: superadminUser.id,
        approvedOn: new Date(),
        items: {
          create: [{ categoryId: eqCat.id, amount: 200000.0, justification: 'Labs' }],
        },
      },
    });

    // Create inactive category
    inactiveCat = await prisma.category.create({
      data: { name: 'Obsolete Expense Cat', isActive: false },
    });

    // Create inactive department
    inactiveDept = await prisma.department.create({
      data: { code: 'INACT_EXP_DEPT', name: 'Inactive Dept', isActive: false },
    });

    // Create closed FY
    closedFy = await prisma.financialYear.create({
      data: {
        year: '2020-21',
        startDate: new Date('2020-04-01'),
        endDate: new Date('2021-03-31'),
        isActive: false,
        status: 'CLOSED',
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "expenses"');
    await prisma.$executeRawUnsafe('DELETE FROM "budget_items"');
    await prisma.$executeRawUnsafe('DELETE FROM "budgets"');
    if (inactiveDept) await prisma.department.delete({ where: { id: inactiveDept.id } }).catch(() => {});
    if (inactiveCat) await prisma.category.delete({ where: { id: inactiveCat.id } }).catch(() => {});
    if (closedFy) await prisma.financialYear.delete({ where: { id: closedFy.id } }).catch(() => {});
    await prisma.user.delete({ where: { email: 'staff_pharma@college.edu' } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Validation & Business Rules for Creating Draft', () => {
    it('rejects expense draft creation if amount <= 0', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 0,
          purpose: 'Free items',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects expense draft if category is inactive', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: inactiveCat.id,
          amount: 5000,
          purpose: 'Testing inactive category',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects expense draft if department is inactive', async () => {
      const inactiveStaff = await prisma.user.create({
        data: {
          email: 'staff_inactive_dept@college.edu',
          name: 'Staff Inactive Dept',
          role: 'STAFF',
          departmentId: inactiveDept.id,
          passwordHash: superadminUser.passwordHash,
          isActive: true,
        },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'staff_inactive_dept@college.edu', password: 'Password@123' });
      const inactiveStaffToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${inactiveStaffToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: inactiveDept.id,
          categoryId: eqCat.id,
          amount: 5000,
          purpose: 'Testing inactive dept',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      await prisma.user.delete({ where: { id: inactiveStaff.id } });
    });

    it('rejects expense draft if financial year is inactive or not OPEN', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: closedFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 5000,
          purpose: 'Testing closed FY',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects expense draft if department does not have an APPROVED budget in that financial year', async () => {
      // Pharma has no approved budget
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${hodPharmaToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: pharmaDept.id,
          categoryId: eqCat.id,
          amount: 5000,
          purpose: 'Testing unapproved budget dept',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/budget/i);
    });

    it('allows STAFF to create a DRAFT expense for their own department and writes audit log', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 15000.5,
          purpose: 'Robotics lab sensors',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(Number(res.body.data.amount)).toBe(15000.5);

      // Verify audit log entry
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'EXPENSE_CREATE',
          recordId: String(res.body.data.id),
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.userId).toBe(staffEtUser.id);
    });
  });

  describe('Scoping & Permissions on Draft Creation', () => {
    it('prevents HOD from creating an expense for another department (403)', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          financialYearId: activeFy.id,
          departmentId: pharmaDept.id,
          categoryId: eqCat.id,
          amount: 5000,
          purpose: 'Illegal cross-department',
        });

      expect(res.status).toBe(403);
    });

    it('prevents FINANCE, SUPER_ADMIN, AUDITOR, and MANAGEMENT from creating expenses (403)', async () => {
      const payload = {
        financialYearId: activeFy.id,
        departmentId: etDept.id,
        categoryId: eqCat.id,
        amount: 5000,
        purpose: 'Attempted creation',
      };

      for (const token of [financeToken, adminToken, auditorToken, managementToken]) {
        const res = await request(app)
          .post('/api/v1/expenses')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Editing & Deleting Draft Expenses', () => {
    let draftExpense;

    beforeEach(async () => {
      // Create a fresh draft by staff_et
      draftExpense = await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 10000.0,
          purpose: 'Draft to edit or delete',
          status: 'DRAFT',
          createdBy: staffEtUser.id,
        },
      });
    });

    it('allows creator (STAFF) to edit their own draft expense', async () => {
      const res = await request(app)
        .put(`/api/v1/expenses/${draftExpense.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({
          amount: 12000.0,
          purpose: 'Updated purpose by creator',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.amount)).toBe(12000.0);
      expect(res.body.data.purpose).toBe('Updated purpose by creator');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'EXPENSE_UPDATE', recordId: String(draftExpense.id) },
      });
      expect(audit).toBeDefined();
    });

    it('allows department HOD to edit a draft expense created by department staff', async () => {
      const res = await request(app)
        .put(`/api/v1/expenses/${draftExpense.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`)
        .send({
          amount: 11000.0,
          purpose: 'Updated purpose by HOD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.amount)).toBe(11000.0);
    });

    it('prevents another staff member from editing the draft (403)', async () => {
      const res = await request(app)
        .put(`/api/v1/expenses/${draftExpense.id}`)
        .set('Authorization', `Bearer ${staffPharmaToken}`)
        .send({
          amount: 9999.0,
        });

      expect(res.status).toBe(403);
    });

    it('rejects editing a non-draft expense with 409 Conflict', async () => {
      const approvedExpense = await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 20000.0,
          purpose: 'Non-draft expense',
          status: 'APPROVED',
          createdBy: staffEtUser.id,
        },
      });

      const res = await request(app)
        .put(`/api/v1/expenses/${approvedExpense.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`)
        .send({ amount: 25000.0 });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('allows creator to delete a draft expense and writes audit log', async () => {
      const res = await request(app)
        .delete(`/api/v1/expenses/${draftExpense.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await prisma.expense.findUnique({ where: { id: draftExpense.id } });
      expect(deleted).toBeNull();

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'EXPENSE_DELETE', recordId: String(draftExpense.id) },
      });
      expect(audit).toBeDefined();
    });

    it('allows department HOD to delete a draft expense', async () => {
      const res = await request(app)
        .delete(`/api/v1/expenses/${draftExpense.id}`)
        .set('Authorization', `Bearer ${hodEtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects deleting a non-draft expense with 409 Conflict', async () => {
      const paidExpense = await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 50000.0,
          purpose: 'Paid expense',
          status: 'PAID',
          createdBy: staffEtUser.id,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/expenses/${paidExpense.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Listing & Scoping & Pagination', () => {
    it('scopes GET /expenses: HOD and STAFF see only their own department', async () => {
      const resStaff = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${staffEtToken}`);

      expect(resStaff.status).toBe(200);
      expect(resStaff.body.success).toBe(true);
      expect(resStaff.body.meta).toBeDefined();
      expect(Array.isArray(resStaff.body.data)).toBe(true);

      for (const item of resStaff.body.data) {
        expect(item.departmentId).toBe(etDept.id);
      }
    });

    it('scopes GET /expenses: FINANCE, MANAGEMENT, AUDITOR, SUPER_ADMIN can view all', async () => {
      for (const token of [financeToken, managementToken, auditorToken, adminToken]) {
        const res = await request(app)
          .get('/api/v1/expenses')
          .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.meta).toBeDefined();
      }
    });

    it('supports pagination meta (page, limit, total, totalPages)', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(typeof res.body.meta.total).toBe('number');
      expect(typeof res.body.meta.totalPages).toBe('number');
    });

    it('scopes GET /expenses/:id: HOD/STAFF cannot view another department expense (403)', async () => {
      // Create expense in ET
      const etExp = await prisma.expense.create({
        data: {
          financialYearId: activeFy.id,
          departmentId: etDept.id,
          categoryId: eqCat.id,
          amount: 2500.0,
          purpose: 'ET Secret',
          status: 'DRAFT',
          createdBy: staffEtUser.id,
        },
      });

      // Staff pharma tries to view ET expense -> 403
      const res = await request(app)
        .get(`/api/v1/expenses/${etExp.id}`)
        .set('Authorization', `Bearer ${staffPharmaToken}`);
      expect(res.status).toBe(403);

      // Staff ET views ET expense -> 200
      const resEt = await request(app)
        .get(`/api/v1/expenses/${etExp.id}`)
        .set('Authorization', `Bearer ${staffEtToken}`);
      expect(resEt.status).toBe(200);
      expect(resEt.body.data.id).toBe(etExp.id);
    });
  });
});
