import { apiClient } from './client.js';

export async function getDashboardSummary(params = {}) {
  const res = await apiClient.get('/dashboard/summary', { params });
  return res.data.data;
}
