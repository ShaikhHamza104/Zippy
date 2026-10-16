// client/tests/routes.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute.jsx';
import { RoleRoute } from '../src/components/auth/RoleRoute.jsx';
import { useAuthStore } from '../src/stores/authStore.js';

describe('Route Guards', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  describe('ProtectedRoute', () => {
    it('redirects unauthenticated users to /login', () => {
      useAuthStore.setState({ isAuthenticated: false, isLoading: false });

      render(
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <div>Secret Checkout Page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Secret Checkout Page')).not.toBeInTheDocument();
    });

    it('renders protected content when user is authenticated', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'u-1', name: 'John Doe', role: 'CUSTOMER' },
        accessToken: 'valid.token',
      });

      render(
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <div>Secret Checkout Page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Secret Checkout Page')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('RoleRoute', () => {
    it('redirects unauthorized role to /', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'u-2', name: 'Standard Customer', role: 'CUSTOMER' },
        accessToken: 'valid.token',
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <div>Admin Control Center</div>
                </RoleRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Control Center')).not.toBeInTheDocument();
    });

    it('allows access when user role matches', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'u-admin', name: 'Staff Member', role: 'ADMIN' },
        accessToken: 'valid.token',
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <div>Admin Control Center</div>
                </RoleRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Control Center')).toBeInTheDocument();
    });

    it('allows SUPER_ADMIN to access any role-restricted route', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'u-super', name: 'Super Admin', role: 'SUPER_ADMIN' },
        accessToken: 'valid.token',
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <div>Admin Control Center</div>
                </RoleRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Control Center')).toBeInTheDocument();
    });
  });
});
