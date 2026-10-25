import { apiClient } from './client.js';

// Financial Years
export async function getFinancialYears() {
  const res = await apiClient.get('/financial-years');
  return res.data.data;
}

export async function getActiveFinancialYear() {
  const res = await apiClient.get('/financial-years/active');
  return res.data.data;
}

export async function createFinancialYear(data) {
  const res = await apiClient.post('/financial-years', data);
  return res.data.data;
}

export async function activateFinancialYear(id) {
  const res = await apiClient.patch(`/financial-years/${id}/activate`);
  return res.data.data;
}

export async function updateFinancialYear(id, data) {
  const res = await apiClient.put(`/financial-years/${id}`, data);
  return res.data.data;
}

// Departments
export async function getDepartments(includeInactive = false) {
  const res = await apiClient.get(`/departments${includeInactive ? '?includeInactive=true' : ''}`);
  return res.data.data;
}

export async function getDepartment(id) {
  const res = await apiClient.get(`/departments/${id}`);
  return res.data.data;
}

export async function createDepartment(data) {
  const res = await apiClient.post('/departments', data);
  return res.data.data;
}

export async function updateDepartment(id, data) {
  const res = await apiClient.put(`/departments/${id}`, data);
  return res.data.data;
}

export async function deleteDepartment(id) {
  const res = await apiClient.delete(`/departments/${id}`);
  return res.data.data;
}

// Categories
export async function getCategories(includeInactive = false) {
  const res = await apiClient.get(`/categories${includeInactive ? '?includeInactive=true' : ''}`);
  return res.data.data;
}

export async function getCategory(id) {
  const res = await apiClient.get(`/categories/${id}`);
  return res.data.data;
}

export async function createCategory(data) {
  const res = await apiClient.post('/categories', data);
  return res.data.data;
}

export async function updateCategory(id, data) {
  const res = await apiClient.put(`/categories/${id}`, data);
  return res.data.data;
}

export async function deleteCategory(id) {
  const res = await apiClient.delete(`/categories/${id}`);
  return res.data.data;
}
