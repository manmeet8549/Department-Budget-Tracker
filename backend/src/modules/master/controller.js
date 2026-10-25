import * as masterService from './service.js';

// ==========================================
// Financial Years
// ==========================================

export async function createFinancialYear(req, res, next) {
  try {
    const fy = await masterService.createFinancialYear(req.body, req.user.id);
    res.status(201).json({ success: true, data: fy });
  } catch (err) {
    next(err);
  }
}

export async function listFinancialYears(_req, res, next) {
  try {
    const years = await masterService.listFinancialYears();
    res.status(200).json({ success: true, data: years });
  } catch (err) {
    next(err);
  }
}

export async function getActiveFinancialYear(_req, res, next) {
  try {
    const fy = await masterService.getActiveFinancialYear();
    res.status(200).json({ success: true, data: fy });
  } catch (err) {
    next(err);
  }
}

export async function setActiveFinancialYear(req, res, next) {
  try {
    const fy = await masterService.setActiveFinancialYear(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: fy });
  } catch (err) {
    next(err);
  }
}

export async function updateFinancialYear(req, res, next) {
  try {
    const fy = await masterService.updateFinancialYear(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: fy });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Departments
// ==========================================

export async function createDepartment(req, res, next) {
  try {
    const dept = await masterService.createDepartment(req.body, req.user.id);
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

export async function listDepartments(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'SUPER_ADMIN';
    const departments = await masterService.listDepartments({ includeInactive });
    res.status(200).json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
}

export async function getDepartment(req, res, next) {
  try {
    const dept = await masterService.getDepartment(req.params.id);
    res.status(200).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const dept = await masterService.updateDepartment(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const dept = await masterService.deleteDepartment(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Categories
// ==========================================

export async function createCategory(req, res, next) {
  try {
    const category = await masterService.createCategory(req.body, req.user.id);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function listCategories(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'SUPER_ADMIN';
    const categories = await masterService.listCategories({ includeInactive });
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req, res, next) {
  try {
    const category = await masterService.getCategory(req.params.id);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await masterService.updateCategory(req.params.id, req.body, req.user.id);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await masterService.deleteCategory(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}
