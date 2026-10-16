// client/src/stores/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: ({ user, accessToken }) =>
    set({
      user,
      accessToken,
      isAuthenticated: !!(user && accessToken),
      isLoading: false,
    }),

  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: !!accessToken,
      isLoading: false,
    }),

  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : userData,
    })),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  hasRole: (role) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.role === role;
  },
}));

export default useAuthStore;
