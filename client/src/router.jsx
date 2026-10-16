// client/src/router.jsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { RoleRoute } from './components/auth/RoleRoute.jsx';

const RootLayout = lazy(() => import('./layouts/RootLayout.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'));

// Customer Profile & Commerce Pages
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage.jsx'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage.jsx'));
const OrderSuccessPage = lazy(() => import('./pages/orders/OrderSuccessPage.jsx'));
const OrdersListPage = lazy(() => import('./pages/orders/OrdersListPage.jsx'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage.jsx'));

// Admin Backoffice Lazy Loaded Pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage.jsx'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage.jsx'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage.jsx'));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage.jsx'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage.jsx'));
const AdminBannersPage = lazy(() => import('./pages/admin/AdminBannersPage.jsx'));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage.jsx'));

export const router = createBrowserRouter([
  // 1. Customer Storefront App
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'categories',
        element: <ProductsPage />,
      },
      {
        path: 'categories/:slug',
        element: <ProductsPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'products/:slug',
        element: <ProductDetailPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      // Auth routes
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: 'reset-password',
        element: <ResetPasswordPage />,
      },
      // Protected routes
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrdersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/:orderId',
        element: (
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/:orderId/success',
        element: (
          <ProtectedRoute>
            <OrderSuccessPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  // 2. Isolated Admin Backoffice App (Code-Split & Guarded)
  {
    path: '/admin',
    element: (
      <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <AdminLayout />
      </RoleRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'products',
        element: <AdminProductsPage />,
      },
      {
        path: 'categories',
        element: <AdminCategoriesPage />,
      },
      {
        path: 'orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'customers',
        element: <AdminCustomersPage />,
      },
      {
        path: 'coupons',
        element: <AdminCouponsPage />,
      },
      {
        path: 'banners',
        element: <AdminBannersPage />,
      },
      {
        path: 'audit-logs',
        element: <AdminAuditLogsPage />,
      },
    ],
  },
]);

export default router;
