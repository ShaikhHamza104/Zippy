// client/tests/stores.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/stores/authStore.js';
import { useUIStore } from '../src/stores/uiStore.js';

describe('Zustand Stores', () => {
  describe('useAuthStore', () => {
    beforeEach(() => {
      useAuthStore.getState().clearAuth();
    });

    it('initializes with unauthenticated empty state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('sets auth credentials and calculates isAuthenticated', () => {
      useAuthStore.getState().setAuth({
        user: { id: 'u-1', name: 'Zippy Customer', email: 'cust@zippy.test', role: 'CUSTOMER' },
        accessToken: 'mock.access.token',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user.name).toBe('Zippy Customer');
      expect(state.accessToken).toBe('mock.access.token');
    });

    it('updates user profile data partially', () => {
      useAuthStore.getState().setAuth({
        user: { id: 'u-1', name: 'Original Name', email: 'cust@zippy.test', role: 'CUSTOMER' },
        accessToken: 'mock.token',
      });

      useAuthStore.getState().updateUser({ name: 'Updated Name', phone: '9876543210' });

      const state = useAuthStore.getState();
      expect(state.user.name).toBe('Updated Name');
      expect(state.user.phone).toBe('9876543210');
      expect(state.user.email).toBe('cust@zippy.test');
    });

    it('evaluates role checks and grants SUPER_ADMIN full access', () => {
      useAuthStore.getState().setAuth({
        user: { id: 'u-admin', name: 'Admin User', role: 'ADMIN' },
        accessToken: 'admin.token',
      });

      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
      expect(useAuthStore.getState().hasRole('CUSTOMER')).toBe(false);

      // Super admin override
      useAuthStore.getState().setAuth({
        user: { id: 'u-super', name: 'Super Admin', role: 'SUPER_ADMIN' },
        accessToken: 'super.token',
      });

      expect(useAuthStore.getState().hasRole('CUSTOMER')).toBe(true);
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
      expect(useAuthStore.getState().hasRole('SUPER_ADMIN')).toBe(true);
    });

    it('clears auth on logout', () => {
      useAuthStore.getState().setAuth({
        user: { id: 'u-1', role: 'CUSTOMER' },
        accessToken: 'token',
      });
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('useUIStore', () => {
    beforeEach(() => {
      useUIStore.setState({
        toasts: [],
        deliveryPincode: '560001',
        isPincodeModalOpen: false,
        isCartDrawerOpen: false,
      });
    });

    it('adds and removes toasts properly', () => {
      const id = useUIStore.getState().addToast({
        type: 'success',
        title: 'Item Added',
        message: 'Product added to cart',
        duration: 0,
      });

      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].title).toBe('Item Added');

      useUIStore.getState().removeToast(id);
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('updates delivery pincode and closes modal', () => {
      useUIStore.getState().togglePincodeModal(true);
      expect(useUIStore.getState().isPincodeModalOpen).toBe(true);

      useUIStore.getState().setPincode('400001');
      expect(useUIStore.getState().deliveryPincode).toBe('400001');
      expect(useUIStore.getState().isPincodeModalOpen).toBe(false);
    });

    it('toggles cart drawer visibility', () => {
      expect(useUIStore.getState().isCartDrawerOpen).toBe(false);
      useUIStore.getState().toggleCartDrawer(true);
      expect(useUIStore.getState().isCartDrawerOpen).toBe(true);
      useUIStore.getState().toggleCartDrawer(false);
      expect(useUIStore.getState().isCartDrawerOpen).toBe(false);
    });
  });
});
