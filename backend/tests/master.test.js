import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Iteration 2: Master Data Module (Financial Years, Departments, Categories)', () => {
  let app;
  let adminToken;
  let hodToken;
  let staffToken;
  let financeToken;

  beforeAll(async () => {
    app = createApp();

    // Log in as SUPER_ADMIN
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@college.edu', password: 'Password@123' });
    adminToken = adminLogin.body.data.accessToken;

    // Log in as HOD
    const hodLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hod_et@college.edu', password: 'Password@123' });
    hodToken = hodLogin.body.data.accessToken;

    // Log in as STAFF
    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff_et@college.edu', password: 'Password@123' });
    staffToken = staffLogin.body.data.accessToken;

    // Log in as FINANCE
    const finLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'finance@college.edu', password: 'Password@123' });
    financeToken = finLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Financial Years', () => {
    it('creates a financial year and logs audit event', async () => {
      const yearName = `FY-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          year: yearName,
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: '2027-03-31T23:59:59.999Z',
          status: 'OPEN',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.year).toBe(yearName);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'financial_years',
          action: 'FINANCIAL_YEAR_CREATE',
          recordId: String(res.body.data.id),
        },
      });
      expect(audit).toBeDefined();
    });

    it('enforces only one active financial year at a time', async () => {
      const fy1Res = await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          year: `FY-ACT1-${Date.now()}`,
          startDate: '2027-04-01T00:00:00.000Z',
          endDate: '2028-03-31T23:59:59.999Z',
          isActive: false,
        });
      const fy1Id = fy1Res.body.data.id;

      const fy2Res = await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          year: `FY-ACT2-${Date.now()}`,
          startDate: '2028-04-01T00:00:00.000Z',
          endDate: '2029-03-31T23:59:59.999Z',
          isActive: false,
        });
      const fy2Id = fy2Res.body.data.id;

      // Activate FY1
      const act1 = await request(app)
        .patch(`/api/v1/financial-years/${fy1Id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(act1.status).toBe(200);
      expect(act1.body.data.isActive).toBe(true);

      // Verify FY1 is active
      const checkFy1 = await prisma.financialYear.findUnique({ where: { id: fy1Id } });
      expect(checkFy1.isActive).toBe(true);

      // Activate FY2
      const act2 = await request(app)
        .patch(`/api/v1/financial-years/${fy2Id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(act2.status).toBe(200);
      expect(act2.body.data.isActive).toBe(true);

      // Verify FY1 is now inactive and FY2 is active
      const checkFy1After = await prisma.financialYear.findUnique({ where: { id: fy1Id } });
      const checkFy2After = await prisma.financialYear.findUnique({ where: { id: fy2Id } });
      expect(checkFy1After.isActive).toBe(false);
      expect(checkFy2After.isActive).toBe(true);

      // Verify audit log for activate
      const audit = await prisma.auditLog.findFirst({
        where: {
          tableName: 'financial_years',
          action: 'FINANCIAL_YEAR_ACTIVATE',
          recordId: String(fy2Id),
        },
      });
      expect(audit).toBeDefined();
    });

    it('rejects duplicate financial year name with 409', async () => {
      const yearName = `FY-DUP-${Date.now()}`;
      await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          year: yearName,
          startDate: '2029-04-01T00:00:00.000Z',
          endDate: '2030-03-31T23:59:59.999Z',
        });

      const res = await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          year: yearName,
          startDate: '2029-04-01T00:00:00.000Z',
          endDate: '2030-03-31T23:59:59.999Z',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Departments', () => {
    it('seeds and verifies sub-units link to MT correctly', async () => {
      const mtDept = await prisma.department.findUnique({ where: { code: 'MT' } });
      expect(mtDept).toBeDefined();

      const bba = await prisma.department.findUnique({ where: { code: 'BBA' } });
      const bcom = await prisma.department.findUnique({ where: { code: 'BCOM' } });

      expect(bba).toBeDefined();
      expect(bba.parentId).toBe(mtDept.id);

      expect(bcom).toBeDefined();
      expect(bcom.parentId).toBe(mtDept.id);
    });

    it('rejects duplicate department code with 409', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ET',
          name: 'Another Engineering Block',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('creates, updates, and soft-deletes a department, writing audit logs', async () => {
      const code = `D${Date.now().toString().slice(-6)}`;
      const createRes = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code,
          name: 'Temporary Department',
        });

      expect(createRes.status).toBe(201);
      const deptId = createRes.body.data.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/departments/${deptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Temp Department',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Updated Temp Department');

      // Soft delete
      const deleteRes = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isActive).toBe(false);

      // Verify default list excludes soft-deleted department
      const listRes = await request(app)
        .get('/api/v1/departments')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((d) => d.id === deptId);
      expect(found).toBeUndefined();

      // Verify audit logs created for create, update, and delete
      const audits = await prisma.auditLog.findMany({
        where: {
          tableName: 'departments',
          recordId: String(deptId),
        },
      });
      const actions = audits.map((a) => a.action);
      expect(actions).toContain('DEPARTMENT_CREATE');
      expect(actions).toContain('DEPARTMENT_UPDATE');
      expect(actions).toContain('DEPARTMENT_DELETE');
    });
  });

  describe('Categories', () => {
    it('verifies seeded categories exist', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const names = res.body.data.map((c) => c.name);
      expect(names).toContain('Equipment');
      expect(names).toContain('Consumables');
      expect(names).toContain('Maintenance');
      expect(names).toContain('Software');
    });

    it('rejects duplicate category name with 409', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Equipment',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('creates, updates, and soft-deletes a category with audit logs', async () => {
      const catName = `Cat-${Date.now()}`;
      const createRes = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: catName,
          description: 'Test category description',
        });

      expect(createRes.status).toBe(201);
      const catId = createRes.body.data.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated description',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated description');

      // Soft delete
      const deleteRes = await request(app)
        .delete(`/api/v1/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isActive).toBe(false);

      // Verify default list excludes soft-deleted category
      const listRes = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${staffToken}`);
      const found = listRes.body.data.find((c) => c.id === catId);
      expect(found).toBeUndefined();

      // Check audit
      const audits = await prisma.auditLog.findMany({
        where: {
          tableName: 'categories',
          recordId: String(catId),
        },
      });
      const actions = audits.map((a) => a.action);
      expect(actions).toContain('CATEGORY_CREATE');
      expect(actions).toContain('CATEGORY_UPDATE');
      expect(actions).toContain('CATEGORY_DELETE');
    });
  });

  describe('Role Matrix Enforcement', () => {
    it('forbids non-SUPER_ADMIN from mutating financial years', async () => {
      const res = await request(app)
        .post('/api/v1/financial-years')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          year: 'FY-FORBIDDEN',
          startDate: '2025-04-01T00:00:00.000Z',
          endDate: '2026-03-31T23:59:59.999Z',
        });
      expect(res.status).toBe(403);
    });

    it('forbids non-SUPER_ADMIN from mutating departments', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          code: 'FORBIDDEN',
          name: 'Forbidden Dept',
        });
      expect(res.status).toBe(403);
    });

    it('forbids non-SUPER_ADMIN from mutating categories', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Forbidden Cat',
        });
      expect(res.status).toBe(403);
    });

    it('allows all authenticated roles to read active master data', async () => {
      const roles = [financeToken, hodToken, staffToken];
      for (const token of roles) {
        const fyRes = await request(app)
          .get('/api/v1/financial-years/active')
          .set('Authorization', `Bearer ${token}`);
        expect(fyRes.status).toBe(200);

        const deptRes = await request(app)
          .get('/api/v1/departments')
          .set('Authorization', `Bearer ${token}`);
        expect(deptRes.status).toBe(200);

        const catRes = await request(app)
          .get('/api/v1/categories')
          .set('Authorization', `Bearer ${token}`);
        expect(catRes.status).toBe(200);
      }
    });
  });
});
