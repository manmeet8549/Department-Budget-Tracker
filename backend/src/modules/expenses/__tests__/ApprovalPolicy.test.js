import {
  ApprovalPolicy,
  defaultApprovalPolicy,
} from '../ApprovalPolicy.js';

describe('ApprovalPolicy Extension Point', () => {
  test('base ApprovalPolicy class defines the interface and throws if unimplemented', async () => {
    const policy = new ApprovalPolicy();
    await expect(policy.nextApprover({}, {})).rejects.toThrow('nextApprover must be implemented');
    await expect(policy.isAllowedApprover({}, {}, {})).rejects.toThrow('isAllowedApprover must be implemented');
  });

  test('STAFF request nextApprover returns HOD of the same department', async () => {
    const expense = { id: 1, departmentId: 10, createdBy: 100 };
    const requester = { id: 100, role: 'STAFF', departmentId: 10 };

    const next = await defaultApprovalPolicy.nextApprover(expense, requester);
    expect(next).toEqual({
      stepNo: 1,
      role: 'HOD',
      departmentId: 10,
    });
  });

  test('HOD request nextApprover returns FINANCE', async () => {
    const expense = { id: 2, departmentId: 10, createdBy: 101 };
    const requester = { id: 101, role: 'HOD', departmentId: 10 };

    const next = await defaultApprovalPolicy.nextApprover(expense, requester);
    expect(next).toEqual({
      stepNo: 1,
      role: 'FINANCE',
    });
  });

  test('isAllowedApprover rejects when candidate is the requester (rule: requester can never approve)', async () => {
    const expense = { id: 1, departmentId: 10, createdBy: 100 };
    const requester = { id: 100, role: 'STAFF', departmentId: 10 };
    const candidate = { id: 100, role: 'HOD', departmentId: 10 }; // same id

    const allowed = await defaultApprovalPolicy.isAllowedApprover(expense, requester, candidate);
    expect(allowed).toBe(false);
  });

  test('isAllowedApprover allows correct HOD for STAFF request and rejects HOD of different department', async () => {
    const expense = { id: 1, departmentId: 10, createdBy: 100 };
    const requester = { id: 100, role: 'STAFF', departmentId: 10 };

    const matchingHod = { id: 200, role: 'HOD', departmentId: 10 };
    const otherDeptHod = { id: 201, role: 'HOD', departmentId: 20 };
    const financeUser = { id: 300, role: 'FINANCE' };

    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, matchingHod)).toBe(true);
    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, otherDeptHod)).toBe(false);
    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, financeUser)).toBe(false);
  });

  test('isAllowedApprover allows FINANCE for HOD request and rejects other roles', async () => {
    const expense = { id: 2, departmentId: 10, createdBy: 200 };
    const requester = { id: 200, role: 'HOD', departmentId: 10 };

    const financeUser = { id: 300, role: 'FINANCE' };
    const otherHod = { id: 201, role: 'HOD', departmentId: 20 };
    const staffUser = { id: 400, role: 'STAFF', departmentId: 10 };

    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, financeUser)).toBe(true);
    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, otherHod)).toBe(false);
    expect(await defaultApprovalPolicy.isAllowedApprover(expense, requester, staffUser)).toBe(false);
  });
});
