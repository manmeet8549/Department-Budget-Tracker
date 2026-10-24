import * as auth from '../index.js';

describe('auth module contract (index.js)', () => {
  it('exports all expected service functions and routers', () => {
    expect(typeof auth.login).toBe('function');
    expect(typeof auth.refresh).toBe('function');
    expect(typeof auth.changePassword).toBe('function');
    expect(typeof auth.getUserById).toBe('function');
    expect(typeof auth.getUserScope).toBe('function');
    expect(typeof auth.isActive).toBe('function');
    expect(typeof auth.listApprovers).toBe('function');
    expect(typeof auth.createUser).toBe('function');
    expect(typeof auth.listUsers).toBe('function');
    expect(typeof auth.updateUser).toBe('function');

    expect(typeof auth.authRouter).toBe('function');
    expect(typeof auth.usersRouter).toBe('function');
  });

  it('getUserScope returns expected object shape', () => {
    const scope = auth.getUserScope({ role: 'HOD', departmentId: 2 });
    expect(scope).toEqual({
      role: 'HOD',
      departmentId: 2,
      isDepartmentScoped: true,
    });

    const adminScope = auth.getUserScope({ role: 'SUPER_ADMIN', departmentId: null });
    expect(adminScope).toEqual({
      role: 'SUPER_ADMIN',
      departmentId: null,
      isDepartmentScoped: false,
    });
  });
});
