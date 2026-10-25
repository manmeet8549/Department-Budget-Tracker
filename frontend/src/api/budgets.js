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

export async function approveBudget(id) {
  const res = await apiClient.post(`/budgets/${id}/approve`);
  return res.data.data;
}
