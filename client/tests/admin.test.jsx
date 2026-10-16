// client/tests/admin.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminLayout } from '../src/layouts/AdminLayout.jsx';
import { AdminDashboardPage } from '../src/pages/admin/AdminDashboardPage.jsx';
import { AdminProductsPage } from '../src/pages/admin/AdminProductsPage.jsx';
import { AdminCategoriesPage } from '../src/pages/admin/AdminCategoriesPage.jsx';
import { AdminOrdersPage } from '../src/pages/admin/AdminOrdersPage.jsx';
import { AdminCustomersPage } from '../src/pages/admin/AdminCustomersPage.jsx';
import { AdminCouponsPage } from '../src/pages/admin/AdminCouponsPage.jsx';
import { AdminBannersPage } from '../src/pages/admin/AdminBannersPage.jsx';
import { AdminAuditLogsPage } from '../src/pages/admin/AdminAuditLogsPage.jsx';
import { RoleRoute } from '../src/components/auth/RoleRoute.jsx';
import { useAuthStore } from '../src/stores/authStore.js';
import { useUIStore } from '../src/stores/uiStore.js';
import * as apiModule from '../src/services/api.js';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Phase 9: Admin Backoffice UI Components & Flows', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'admin-1',
        name: 'Admin Commander',
        email: 'admin@zippy.test',
        role: 'ADMIN',
      },
      accessToken: 'mock.admin.token',
    });
    useUIStore.setState({ toasts: [] });
    vi.restoreAllMocks();
  });

  describe('AdminLayout & Navigation', () => {
    it('renders sidebar navigation items, admin badge, and storefront link', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/admin']}>
            <AdminLayout />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Coupons')).toBeInTheDocument();
      expect(screen.getByText('Banners')).toBeInTheDocument();
      expect(screen.getByText('Security Logs')).toBeInTheDocument();
      expect(screen.getByText('View Storefront')).toBeInTheDocument();
      expect(screen.getByText('Admin Commander')).toBeInTheDocument();
    });
  });

  describe('Role Protection on /admin', () => {
    it('redirects CUSTOMER users to / when visiting /admin', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'cust-1', name: 'Shopper', role: 'CUSTOMER' },
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Storefront Homepage</div>} />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <div>Secret Backoffice</div>
                </RoleRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Storefront Homepage')).toBeInTheDocument();
      expect(screen.queryByText('Secret Backoffice')).not.toBeInTheDocument();
    });

    it('permits SUPER_ADMIN access to /admin', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'super-1', name: 'Chief Admin', role: 'SUPER_ADMIN' },
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<div>Storefront Homepage</div>} />
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <div>Secret Backoffice</div>
                </RoleRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Secret Backoffice')).toBeInTheDocument();
    });
  });

  describe('AdminDashboardPage', () => {
    it('renders KPI summary cards, status breakdown, and low stock table', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        data: {
          stats: {
            ordersToday: 42,
            totalRevenue: 125000,
            todayRevenue: 8400,
            activeCustomers: 156,
            orderStatusBreakdown: {
              PLACED: 5,
              PACKED: 10,
              OUT_FOR_DELIVERY: 7,
              DELIVERED: 18,
              CANCELLED: 2,
            },
            lowStockCount: 1,
          },
          lowStockAlerts: [
            {
              productId: 'prod-milk',
              productName: 'Amul Fresh Cow Milk',
              sku: 'COW-MILK-1L',
              unit: '1 L',
              stock: 4,
              price: 54,
              brand: 'Amul',
              categorySlug: 'dairy',
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminDashboardPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
      });

      // Assert KPI values
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('₹8,400')).toBeInTheDocument();
      expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();

      // Assert Low Stock table
      expect(screen.getByText('Amul Fresh Cow Milk')).toBeInTheDocument();
      expect(screen.getByText('COW-MILK-1L')).toBeInTheDocument();
      expect(screen.getByText('4 left')).toBeInTheDocument();
    });
  });

  describe('AdminProductsPage', () => {
    it('renders products table, filters, and opens stock update modal', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation((endpoint) => {
        if (endpoint.includes('/categories')) {
          return Promise.resolve({
            data: {
              categories: [{ _id: 'cat-1', name: 'Dairy & Eggs', icon: '🥛' }],
            },
          });
        }
        if (endpoint.includes('/products')) {
          return Promise.resolve({
            pagination: { page: 1, totalPages: 1, total: 1 },
            data: {
              products: [
                {
                  _id: 'prod-1',
                  name: 'Organic Brown Eggs',
                  brand: 'Eggoz',
                  categoryId: { _id: 'cat-1', name: 'Dairy & Eggs', icon: '🥛' },
                  variants: [{ sku: 'EGG-6PK', unit: '6 pcs', price: 90, mrp: 100, stock: 25 }],
                  totalStock: 25,
                  isAvailable: true,
                  images: [{ url: 'https://example.com/egg.jpg', isPrimary: true }],
                },
              ],
            },
          });
        }
        return Promise.resolve({});
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminProductsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Organic Brown Eggs')).toBeInTheDocument();
      });

      expect(screen.getByText('6 pcs:')).toBeInTheDocument();
      expect(screen.getByText('25 in stock')).toBeInTheDocument();

      // Open Stock Modal
      const stockBtn = screen.getByTitle('Update Stock Levels');
      fireEvent.click(stockBtn);

      expect(screen.getByText('Update Variant Inventory')).toBeInTheDocument();
      expect(screen.getByText('Set Absolute Stock')).toBeInTheDocument();
      expect(screen.getByText('Adjust (+ / -)')).toBeInTheDocument();
    });
  });

  describe('AdminCategoriesPage', () => {
    it('renders categories list and opens create category modal', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        count: 1,
        data: {
          categories: [
            {
              _id: 'cat-veg',
              name: 'Fresh Vegetables',
              slug: 'vegetables',
              icon: '🥦',
              description: 'Crisp organic vegetables',
              displayOrder: 1,
              isActive: true,
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminCategoriesPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Fresh Vegetables')).toBeInTheDocument();
      });

      expect(screen.getByText('vegetables')).toBeInTheDocument();
      expect(screen.getByText('#1')).toBeInTheDocument();

      // Open Create Modal
      const addBtn = screen.getByRole('button', { name: /add category/i });
      fireEvent.click(addBtn);

      expect(screen.getByRole('heading', { name: 'Create Category' })).toBeInTheDocument();
    });
  });

  describe('AdminOrdersPage', () => {
    it('renders orders list, status tabs, and opens order details modal', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation((endpoint) => {
        if (endpoint.includes('/orders/ord-123')) {
          return Promise.resolve({
            success: true,
            data: {
              order: {
                id: 'ord-123',
                orderNumber: 'ORD-2026-9999',
                status: 'PACKED',
                subtotal: 350,
                deliveryFee: 15,
                discountAmount: 50,
                totalAmount: 315,
                createdAt: new Date().toISOString(),
                user: { name: 'Priya Sharma', email: 'priya@test.com', phone: '9876543210' },
                deliveryAddressSnapshot: {
                  type: 'Home',
                  line1: 'Flat 402, Green Towers',
                  city: 'Bengaluru',
                  state: 'Karnataka',
                  pincode: '560001',
                },
                payment: { method: 'RAZORPAY', status: 'SUCCESS', id: 'pay_123' },
                items: [
                  {
                    id: 'item-1',
                    mongoProductId: 'p-1',
                    nameSnapshot: 'Aashirvaad Atta [ATTA-5KG]',
                    priceSnapshot: 250,
                    quantity: 1,
                    totalSnapshot: 250,
                  },
                ],
              },
            },
          });
        }
        return Promise.resolve({
          pagination: { page: 1, totalPages: 1, total: 1 },
          data: {
            orders: [
              {
                id: 'ord-123',
                orderNumber: 'ORD-2026-9999',
                createdAt: new Date().toISOString(),
                status: 'PACKED',
                totalAmount: 315,
                user: { name: 'Priya Sharma', phone: '9876543210' },
                payment: { method: 'RAZORPAY', status: 'SUCCESS' },
                items: [{ id: 'i-1' }],
              },
            ],
          },
        });
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminOrdersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('ORD-2026-9999')).toBeInTheDocument();
      });

      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('₹315')).toBeInTheDocument();

      // Click Details
      const detailsBtn = screen.getByRole('button', { name: /details/i });
      fireEvent.click(detailsBtn);

      await waitFor(() => {
        expect(screen.getByText('Order #ORD-2026-9999')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Flat 402, Green Towers, Bengaluru, Karnataka -')
      ).toBeInTheDocument();
      expect(screen.getByText('560001')).toBeInTheDocument();
      expect(screen.getByText('Aashirvaad Atta [ATTA-5KG]')).toBeInTheDocument();
    });
  });

  describe('AdminCustomersPage', () => {
    it('renders customers list and opens block confirmation modal', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        pagination: { page: 1, totalPages: 1, total: 1 },
        data: {
          customers: [
            {
              id: 'cust-xyz',
              name: 'Rahul Varma',
              email: 'rahul@test.com',
              phone: '9123456789',
              emailVerified: true,
              isBlocked: false,
              createdAt: new Date().toISOString(),
              _count: { orders: 8 },
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminCustomersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Rahul Varma')).toBeInTheDocument();
      });

      expect(screen.getByText('rahul@test.com')).toBeInTheDocument();
      expect(screen.getByText('8 orders')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Open Block Modal
      const blockBtn = screen.getByRole('button', { name: /block/i });
      fireEvent.click(blockBtn);

      expect(screen.getByText('Block Customer: Rahul Varma')).toBeInTheDocument();
      expect(screen.getByText('Confirm Account Block')).toBeInTheDocument();
    });
  });

  describe('AdminCouponsPage', () => {
    it('renders coupons table with discount rules', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        count: 1,
        data: {
          coupons: [
            {
              id: 'c-welcome',
              code: 'WELCOME50',
              discountType: 'PERCENTAGE',
              discountValue: 50,
              maxDiscountAmount: 100,
              minOrderAmount: 200,
              usageLimit: 1000,
              validUntil: '2027-12-31T00:00:00.000Z',
              isActive: true,
              _count: { usages: 45 },
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminCouponsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('WELCOME50')).toBeInTheDocument();
      });

      expect(screen.getByText('50% OFF')).toBeInTheDocument();
      expect(screen.getByText('(Up to ₹100)')).toBeInTheDocument();
      expect(screen.getByText('₹200')).toBeInTheDocument();
    });
  });

  describe('AdminBannersPage', () => {
    it('renders banners table and action buttons', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        count: 1,
        data: {
          banners: [
            {
              _id: 'b-1',
              title: 'Morning Essentials Flat 30% Off',
              imageUrl: 'https://example.com/banner.jpg',
              linkUrl: '/categories/breakfast',
              badgeText: 'FLASH DEAL',
              displayOrder: 1,
              isActive: true,
            },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminBannersPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Morning Essentials Flat 30% Off')).toBeInTheDocument();
      });

      expect(screen.getByText('FLASH DEAL')).toBeInTheDocument();
      expect(screen.getByText('/categories/breakfast')).toBeInTheDocument();
    });
  });

  describe('AdminAuditLogsPage', () => {
    it('renders operational audit logs and allows tab switching', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation((endpoint) => {
        if (endpoint.includes('/audit-logs')) {
          return Promise.resolve({
            pagination: { page: 1, totalPages: 1, total: 1 },
            data: {
              auditLogs: [
                {
                  id: 'audit-1',
                  action: 'UPDATE_STOCK',
                  entityType: 'PRODUCT',
                  entityId: 'prod-milk',
                  ipAddress: '192.168.1.10',
                  createdAt: new Date().toISOString(),
                  user: { name: 'Admin One', role: 'ADMIN' },
                  details: { sku: 'MILK-500ML', stock: 50 },
                },
              ],
            },
          });
        }
        return Promise.resolve({
          pagination: { page: 1, totalPages: 1, total: 0 },
          data: { loginLogs: [] },
        });
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminAuditLogsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('UPDATE_STOCK')).toBeInTheDocument();
      });

      expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
      expect(screen.getByText('Admin One')).toBeInTheDocument();

      // Inspect details modal
      const inspectBtn = screen.getByRole('button', { name: /inspect/i });
      fireEvent.click(inspectBtn);

      expect(screen.getByText('Audit Event Details')).toBeInTheDocument();
      expect(screen.getByText('Action: UPDATE_STOCK')).toBeInTheDocument();
    });
  });
});
