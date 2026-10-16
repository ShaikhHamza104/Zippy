// client/tests/api.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, getGuestSessionId, resetGuestSessionId } from '../src/services/api.js';
import { useAuthStore } from '../src/stores/authStore.js';

describe('API Client Service', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Guest Session Management', () => {
    it('generates a persistent guest session id in localStorage', () => {
      const sessionId1 = getGuestSessionId();
      expect(sessionId1).toMatch(/^guest_\d+_[a-z0-9]+$/);
      expect(localStorage.getItem('zippy_guest_session_id')).toBe(sessionId1);

      // Re-invoking returns the identical persisted ID
      const sessionId2 = getGuestSessionId();
      expect(sessionId2).toBe(sessionId1);
    });

    it('resets and generates a fresh guest session id', () => {
      const initialId = getGuestSessionId();
      const freshId = resetGuestSessionId();

      expect(freshId).toMatch(/^guest_\d+_[a-z0-9]+$/);
      expect(freshId).not.toBe(initialId);
      expect(localStorage.getItem('zippy_guest_session_id')).toBe(freshId);
    });
  });

  describe('apiFetch Headers and Interceptors', () => {
    it('attaches CSRF headers and x-session-id to outgoing requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { items: [] } }),
      });
      global.fetch = mockFetch;

      const res = await apiFetch('/api/v1/cart');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];

      expect(calledUrl).toBe('http://localhost:5000/api/v1/cart');
      expect(calledOptions.credentials).toBe('include');

      const headers = calledOptions.headers;
      expect(headers.get('X-Zippy-Client')).toBe('web');
      expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
      expect(headers.get('x-session-id')).toMatch(/^guest_/);
      expect(res.data.items).toEqual([]);
    });

    it('attaches Bearer Authorization token when authenticated', async () => {
      useAuthStore.setState({ accessToken: 'test-jwt-token-xyz' });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { user: { id: 1 } } }),
      });
      global.fetch = mockFetch;

      await apiFetch('/api/v1/users/profile');

      const [, calledOptions] = mockFetch.mock.calls[0];
      const headers = calledOptions.headers;
      expect(headers.get('Authorization')).toBe('Bearer test-jwt-token-xyz');
    });

    it('throws structured ApiError when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product does not exist' },
        }),
      });
      global.fetch = mockFetch;

      await expect(apiFetch('/api/v1/products/unknown-slug')).rejects.toThrow(
        'Product does not exist'
      );
    });
  });
});
