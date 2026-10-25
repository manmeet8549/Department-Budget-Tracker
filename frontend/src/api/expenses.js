import { apiClient } from './client.js';

export async function listExpenses(params = {}) {
  const res = await apiClient.get('/expenses', { params });
  return {
    data: res.data.data,
    meta: res.data.meta,
  };
}

export async function getExpense(id) {
  const res = await apiClient.get(`/expenses/${id}`);
  return res.data.data;
}

export async function createExpense(data) {
  const res = await apiClient.post('/expenses', data);
  return res.data.data;
}

export async function updateExpense(id, data) {
  const res = await apiClient.put(`/expenses/${id}`, data);
  return res.data.data;
}

export async function deleteExpense(id) {
  const res = await apiClient.delete(`/expenses/${id}`);
  return res.data.data;
}

export async function submitExpense(id) {
  const res = await apiClient.post(`/expenses/${id}/submit`);
  return res.data.data;
}

export async function approveExpense(id, data = {}) {
  const res = await apiClient.post(`/expenses/${id}/approve`, data);
  return res.data.data;
}

export async function rejectExpense(id, data) {
  const res = await apiClient.post(`/expenses/${id}/reject`, data);
  return res.data.data;
}

export async function payExpense(id, data) {
  const res = await apiClient.post(`/expenses/${id}/pay`, data);
  return res.data.data;
}
