import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Iteration 1: Auth & Audit Module', () => {
  let app;

  beforeAll(async () => {
    app = createApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('fails when user does not exist or password is wrong', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@college.edu', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('logs in successfully, returns accessToken and sets httpOnly refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@college.edu', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      // Check httpOnly refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('denies login if user is disabled', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'disabled_user@college.edu', password: 'Password@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('JWT token validation & expiration', () => {
    it('rejects access to protected routes with an invalid or expired token', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid.expired.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Audit Trail Verification', () => {
    it('verifies that every write creates an audit_logs row', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@college.edu', password: 'Password@123' });

      const token = loginRes.body.data.accessToken;

      const newUserEmail = `test_audited_${Date.now()}@college.edu`;
      const createRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: newUserEmail,
          password: 'Password@123',
          name: 'Audited Staff',
          role: 'STAFF',
          departmentId: 1,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.password).toBeUndefined();
      expect(createRes.body.data.passwordHash).toBeUndefined();

      // Check audit_logs in database
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          tableName: 'users',
          action: 'USER_CREATE',
        },
        orderBy: { id: 'desc' },
      });

      expect(auditEntry).toBeDefined();
      expect(auditEntry.userId).toBe(loginRes.body.data.user.id);
    });

    it('allows SUPER_ADMIN to query GET /api/v1/audit-logs and blocks other roles', async () => {
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@college.edu', password: 'Password@123' });

      const adminToken = adminLogin.body.data.accessToken;

      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
    });
  });

  describe('Department Scoping & Role Matrix', () => {
    it('HOD of one department cannot access another department scope', async () => {
      const hodLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'hod_et@college.edu', password: 'Password@123' });

      const hodToken = hodLogin.body.data.accessToken;

      // HOD attempts to access users management (restricted to SUPER_ADMIN)
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('enforces role matrix across roles on /api/v1/users', async () => {
      const roles = [
        { email: 'management@college.edu', expected: 403 },
        { email: 'finance@college.edu', expected: 403 },
        { email: 'staff_et@college.edu', expected: 403 },
        { email: 'auditor@college.edu', expected: 403 },
      ];

      for (const r of roles) {
        const login = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: r.email, password: 'Password@123' });

        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${login.body.data.accessToken}`);

        expect(res.status).toBe(r.expected);
      }
    });
  });
});
