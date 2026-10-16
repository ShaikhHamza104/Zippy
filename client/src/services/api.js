// client/src/services/api.js
import { useAuthStore } from '../stores/authStore.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GUEST_SESSION_KEY = 'zippy_guest_session_id';

/**
 * Retrieves or generates a persistent guest session identifier.
 */
export const getGuestSessionId = () => {
  if (typeof window === 'undefined') return 'guest_ssr_placeholder';

  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionId) {
    const randomHex = Math.random().toString(36).substring(2, 10);
    sessionId = `guest_${Date.now()}_${randomHex}`;
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Regenerates a fresh guest session ID (e.g. after cart merge).
 */
export const resetGuestSessionId = () => {
  if (typeof window !== 'undefined') {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const newSessionId = `guest_${Date.now()}_${randomHex}`;
    localStorage.setItem(GUEST_SESSION_KEY, newSessionId);
    return newSessionId;
  }
  return 'guest_ssr_placeholder';
};

// Queue state for silent refresh deduplication
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Primary HTTP request client with automatic credentials, headers, and silent refresh interceptor.
 *
 * @param {string} endpoint - API path, e.g. '/api/v1/cart'
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // 1. Set required CSRF / custom client security headers
  headers.set('X-Zippy-Client', 'web');
  headers.set('X-Requested-With', 'XMLHttpRequest');

  // 2. Attach guest session header
  headers.set('x-session-id', getGuestSessionId());

  // 3. Attach Bearer token if user is authenticated
  const currentToken = useAuthStore.getState().accessToken;
  if (currentToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  // 4. Default JSON Content-Type unless FormData is passed
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include', // Ensures httpOnly refresh cookie is sent
  };

  const response = await fetch(url, fetchOptions);

  // 5. Silent refresh on 401 Unauthorized
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register')
  ) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...fetchOptions, headers }).then((res) => handleResponse(res));
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zippy-Client': 'web',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      if (!refreshRes.ok) {
        throw new Error('Refresh token revoked or expired');
      }

      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData?.data?.accessToken;

      if (!newAccessToken) {
        throw new Error('Failed to retrieve new access token');
      }

      useAuthStore.getState().setAccessToken(newAccessToken);
      processQueue(null, newAccessToken);

      // Retry original request with newly issued access token
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      return fetch(url, { ...fetchOptions, headers }).then((res) => handleResponse(res));
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().clearAuth();
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse(response);
}

/**
 * Standardized response handler that parses JSON and creates descriptive errors.
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || data?.message || `HTTP ${response.status} Error`
    );
    error.status = response.status;
    error.code = data?.error?.code || 'API_ERROR';
    error.details = data?.error?.details || null;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Triggers guest-to-user cart merge upon customer login or registration.
 */
export async function mergeGuestCart() {
  const guestSessionId = getGuestSessionId();
  try {
    const res = await apiFetch('/api/v1/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ guestSessionId }),
    });
    // Generate a fresh guest session ID after successful merge
    resetGuestSessionId();
    return res;
  } catch {
    // Non-fatal if guest cart was empty or already merged
    return null;
  }
}

export default apiFetch;
