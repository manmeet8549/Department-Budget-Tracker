import axios from 'axios';

/**
 * Normalizes the API base URL.
 * Handles both "https://domain.com" and "https://domain.com/api/v1".
 */
export function resolveBaseUrl(url) {
  if (!url || typeof url !== 'string') return '/api/v1';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api/v1';
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let tokenGetter = () => null;

export function setTokenGetter(getter) {
  tokenGetter = getter;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
