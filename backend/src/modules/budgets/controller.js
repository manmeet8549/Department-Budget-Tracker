import * as budgetService from './service.js';

export async function createBudget(req, res, next) {
  try {
    const budget = await budgetService.createBudget(req.body, req.user);
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function listBudgets(req, res, next) {
  try {
    const budgets = await budgetService.listBudgets(req.query, req.user);
    res.status(200).json({ success: true, data: budgets });
  } catch (err) {
    next(err);
  }
}

export async function getBudget(req, res, next) {
  try {
    const budget = await budgetService.getBudget(req.params.id, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function updateBudget(req, res, next) {
  try {
    const budget = await budgetService.updateBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function submitBudget(req, res, next) {
  try {
    const budget = await budgetService.submitBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function reviewBudget(req, res, next) {
  try {
    const budget = await budgetService.reviewBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function approveBudget(req, res, next) {
  try {
    const budget = await budgetService.approveBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function rejectBudget(req, res, next) {
  try {
    const budget = await budgetService.rejectBudget(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
}

export async function getBudgetComparison(req, res, next) {
  try {
    const comparison = await budgetService.getBudgetComparison(req.params.id, req.user);
    res.status(200).json({ success: true, data: comparison });
  } catch (err) {
    next(err);
  }
}

export async function setCollegeCeiling(req, res, next) {
  try {
    const ceiling = await budgetService.setCollegeCeiling(req.params.financialYearId, req.body.amount, req.user);
    res.status(200).json({ success: true, data: ceiling });
  } catch (err) {
    next(err);
  }
}

export async function getCollegeCeiling(req, res, next) {
  try {
    const ceiling = await budgetService.getCollegeCeiling(req.params.financialYearId, req.user);
    res.status(200).json({ success: true, data: ceiling });
  } catch (err) {
    next(err);
  }
}
