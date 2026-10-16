// client/src/stores/uiStore.js
import { create } from 'zustand';

const SAVED_PINCODE_KEY = 'zippy_delivery_pincode';

export const useUIStore = create((set, get) => ({
  toasts: [],
  deliveryPincode:
    typeof window !== 'undefined' ? localStorage.getItem(SAVED_PINCODE_KEY) || '560001' : '560001',
  isPincodeModalOpen: false,
  isCartDrawerOpen: false,

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
