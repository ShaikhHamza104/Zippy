// client/src/stores/uiStore.js
import { create } from 'zustand';

const SAVED_PINCODE_KEY = 'zippy_delivery_pincode';
const SAVED_THEME_KEY = 'zippy_theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(SAVED_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore
  }
  return 'light';
};

export const useUIStore = create((set, get) => ({
  toasts: [],
  theme: getInitialTheme(),
  deliveryPincode:
    typeof window !== 'undefined' ? localStorage.getItem(SAVED_PINCODE_KEY) || '560001' : '560001',
  isPincodeModalOpen: false,
  isCartDrawerOpen: false,

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SAVED_THEME_KEY, theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch {
        // Ignore
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  addToast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast = { id, type, title, message, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setPincode: (pincode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_PINCODE_KEY, pincode);
    }
    set({ deliveryPincode: pincode, isPincodeModalOpen: false });
  },

  togglePincodeModal: (isOpen) =>
    set((state) => ({
      isPincodeModalOpen: isOpen !== undefined ? isOpen : !state.isPincodeModalOpen,
    })),

  toggleCartDrawer: (isOpen) =>
    set((state) => ({
      isCartDrawerOpen: isOpen !== undefined ? isOpen : !state.isCartDrawerOpen,
    })),
}));

export default useUIStore;
