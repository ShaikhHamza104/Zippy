// client/src/stores/authStore.js
import { create } from 'zustand';

const getInitialUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zippy_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('zippy_access_token') || null;
  } catch {
    return null;
  }
};

const initialUser = getInitialUser();
const initialToken = getInitialToken();

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  accessToken: initialToken,
  isAuthenticated: !!(initialUser && initialToken),
  isLoading: false,

  setAuth: ({ user, accessToken }) => {
    if (typeof window !== 'undefined') {
      try {
        if (user) localStorage.setItem('zippy_user', JSON.stringify(user));
        if (accessToken) sessionStorage.setItem('zippy_access_token', accessToken);
      } catch {
        // Ignore storage errors
      }
    }
    set({
      user,
      accessToken,
      isAuthenticated: !!(user && accessToken),
      isLoading: false,
    });
  },

  setAccessToken: (accessToken) => {
    if (typeof window !== 'undefined') {
      try {
        if (accessToken) {
          sessionStorage.setItem('zippy_access_token', accessToken);
        } else {
          sessionStorage.removeItem('zippy_access_token');
        }
      } catch {
        // Ignore storage errors
      }
    }
    set({
      accessToken,
      isAuthenticated: !!accessToken,
      isLoading: false,
    });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...userData } : userData;
      if (typeof window !== 'undefined' && updated) {
        try {
          localStorage.setItem('zippy_user', JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
      return { user: updated };
    });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('zippy_user');
        sessionStorage.removeItem('zippy_access_token');
      } catch {
        // Ignore
      }
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  hasRole: (role) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.role === role;
  },
}));

export default useAuthStore;
