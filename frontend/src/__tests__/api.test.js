import { describe, it, expect, beforeEach } from 'vitest';
import api from '../services/api';

describe('Frontend API Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize axios instance with baseURL', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
  });

  it('should set Authorization header when token is stored', async () => {
    localStorage.setItem('token', 'sample-jwt-token-123');
    
    const config = { headers: {} };
    const interceptedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
    expect(interceptedConfig.headers.Authorization).toBe('Bearer sample-jwt-token-123');
  });

  it('should not set Authorization header when no token is present', async () => {
    const config = { headers: {} };
    const interceptedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
    expect(interceptedConfig.headers.Authorization).toBeUndefined();
  });
});
