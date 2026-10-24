import { apiClient } from '../../api/client.js';

export async function loginApi({ email, password }) {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
}

export async function refreshApi() {
  const res = await apiClient.post('/auth/refresh');
  return res.data;
}

export async function logoutApi() {
  const res = await apiClient.post('/auth/logout');
  return res.data;
}

export async function getMeApi() {
  const res = await apiClient.get('/auth/me');
  return res.data;
}
