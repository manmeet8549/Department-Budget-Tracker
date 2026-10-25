import { apiClient } from './client.js';

export async function getBudgets(params = {}) {
  const res = await apiClient.get('/budgets', { params });
  return res.data.data;
}

export async function getBudget(id) {
  const res = await apiClient.get(`/budgets/${id}`);
  return res.data.data;
}

export async function createBudget(data) {
  const res = await apiClient.post('/budgets', data);
  return res.data.data;
}

export async function updateBudget(id, data) {
  const res = await apiClient.put(`/budgets/${id}`, data);
  return res.data.data;
}

export async function submitBudget(id, data = {}) {
  const res = await apiClient.post(`/budgets/${id}/submit`, data);
  return res.data.data;
}

export async function reviewBudget(id, data) {
  const res = await apiClient.post(`/budgets/${id}/review`, data);
  return res.data.data;
}

export async function approveBudget(id, data = {}) {
  const res = await apiClient.post(`/budgets/${id}/approve`, data);
  return res.data.data;
}

export async function rejectBudget(id, data) {
  const res = await apiClient.post(`/budgets/${id}/reject`, data);
  return res.data.data;
}

export async function getBudgetComparison(id) {
  const res = await apiClient.get(`/budgets/${id}/comparison`);
  return res.data.data;
}

export async function getCollegeCeiling(financialYearId) {
  const res = await apiClient.get(`/budget-ceilings/${financialYearId}`);
  return res.data.data;
}

export async function setCollegeCeiling(financialYearId, data) {
  const res = await apiClient.put(`/budget-ceilings/${financialYearId}`, data);
  return res.data.data;
}
