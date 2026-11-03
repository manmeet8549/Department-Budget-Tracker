import { describe, it, expect } from 'vitest';
import { resolveBaseUrl } from '../api/client.js';

describe('Frontend API Client URL Normalization', () => {
  it('defaults to /api/v1 when url is null or undefined', () => {
    expect(resolveBaseUrl(null)).toBe('/api/v1');
    expect(resolveBaseUrl(undefined)).toBe('/api/v1');
    expect(resolveBaseUrl('')).toBe('/api/v1');
  });

  it('preserves existing /api/v1 in full URL', () => {
    expect(resolveBaseUrl('https://my-backend.onrender.com/api/v1')).toBe(
      'https://my-backend.onrender.com/api/v1'
    );
  });

  it('automatically appends /api/v1 when full URL lacks it', () => {
    expect(resolveBaseUrl('https://my-backend.onrender.com')).toBe(
      'https://my-backend.onrender.com/api/v1'
    );
  });

  it('strips trailing slashes before appending /api/v1', () => {
    expect(resolveBaseUrl('https://my-backend.onrender.com/')).toBe(
      'https://my-backend.onrender.com/api/v1'
    );
  });

  it('handles relative path /api/v1', () => {
    expect(resolveBaseUrl('/api/v1')).toBe('/api/v1');
  });
});

