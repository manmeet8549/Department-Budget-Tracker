import { AppError } from '../platform/errors.js';
import * as balanceService from './service.js';

export async function getBalances(req, res, next) {
  try {
    const { financialYearId, departmentId } = req.query;
    const user = req.user;

    const isGlobalRole = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user.role);

    // If departmentId is explicitly requested
    if (departmentId) {
      const deptIdNum = Number(departmentId);
      if (!isGlobalRole && user.departmentId !== deptIdNum) {
        throw new AppError(
          'FORBIDDEN',
          "You are not authorized to view another department's balance",
          403
        );
      }
      const balance = await balanceService.getDepartmentBalance(financialYearId, deptIdNum);
      return res.status(200).json({ success: true, data: balance });
    }

    // No departmentId requested
    if (!isGlobalRole) {
      if (!user.departmentId) {
        throw new AppError('FORBIDDEN', 'User is not assigned to any department', 403);
      }
      const balance = await balanceService.getDepartmentBalance(financialYearId, user.departmentId);
      return res.status(200).json({ success: true, data: balance });
    }

    // Global role with no departmentId gets overall college balance
    const collegeBalance = await balanceService.getCollegeBalance(financialYearId);
    return res.status(200).json({ success: true, data: collegeBalance });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBalances(req, res, next) {
  try {
    const { deptId } = req.params;
    const { financialYearId } = req.query;
    const user = req.user;

    const isGlobalRole = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user.role);
    const deptIdNum = Number(deptId);

    if (!isGlobalRole && user.departmentId !== deptIdNum) {
      throw new AppError(
        'FORBIDDEN',
        "You are not authorized to view another department's category balances",
        403
      );
    }

    const categoryBalances = await balanceService.getCategoryBalances(financialYearId, deptIdNum);
    return res.status(200).json({ success: true, data: categoryBalances });
  } catch (err) {
    next(err);
  }
}
