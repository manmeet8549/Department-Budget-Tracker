import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Silence JSDOM XHR network error outputs during unmocked initial refresh probe
vi.mock('./features/auth/api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshApi: vi.fn().mockRejectedValue(new Error('No token')),
  };
});
