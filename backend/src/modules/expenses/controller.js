import * as expenseService from './service.js';

export async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req.body, req.user);
    return res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req, res, next) {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body, req.user);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    const result = await expenseService.deleteExpense(req.params.id, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getExpense(req, res, next) {
  try {
    const expense = await expenseService.getExpense(req.params.id, req.user);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function listExpenses(req, res, next) {
  try {
    const result = await expenseService.listExpenses(req.query, req.user);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function submitExpense(req, res, next) {
  try {
    const expense = await expenseService.submitExpense(req.params.id, req.user);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function approveExpense(req, res, next) {
  try {
    const expense = await expenseService.approveExpense(req.params.id, req.user, req.body);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function rejectExpense(req, res, next) {
  try {
    const expense = await expenseService.rejectExpense(req.params.id, req.user, req.body);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}

export async function payExpense(req, res, next) {
  try {
    const expense = await expenseService.payExpense(req.params.id, req.user, req.body);
    return res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
}
