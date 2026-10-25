import { apiClient } from './client.js';

export async function getBalances(params = {}) {
  const res = await apiClient.get('/balances', { params });
  return res.data.data;
}

export async function getCategoryBalances(deptId, params = {}) {
  const res = await apiClient.get(`/balances/${deptId}/categories`, { params });
  return res.data.data;
}
