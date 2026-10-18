// client/src/layouts/AdminLayout.jsx
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Tag,
  Image,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useUIStore } from '../stores/uiStore.js';
import { apiFetch } from '../services/api.js';
import { Skeleton, ToastContainer } from '../components/ui/index.js';
// Theme toggle preserved in ThemeToggle.jsx & uiStore.js for future use

const ADMIN_NAV_ITEMS = [
  { name: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { name: 'Products', to: '/admin/products', icon: Package },
  { name: 'Categories', to: '/admin/categories', icon: FolderTree },
  { name: 'Orders', to: '/admin/orders', icon: ShoppingBag },
  { name: 'Customers', to: '/admin/customers', icon: Users },
  { name: 'Coupons', to: '/admin/coupons', icon: Tag },
  { name: 'Banners', to: '/admin/banners', icon: Image },
  { name: 'Security Logs', to: '/admin/audit-logs', icon: ShieldAlert },
];

const AdminLoadingFallback = () => (
  <div className="space-y-6 p-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-80 w-full rounded-2xl" />
  </div>
);

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile sidebar immediately on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Continue client-side clear
    } finally {
      clearAuth();
      addToast({
        type: 'info',
        title: 'Logged out',
        message: 'Admin session terminated safely.',
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 transition-colors overflow-x-hidden w-full max-w-full">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 text-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Close */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
            <Link to="/admin" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black">
                <Zap className="w-5 h-5 fill-current" />
              </span>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Zippy<span className="text-brand-500">.</span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 ml-1.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                  Admin
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={closeMobileMenu}
              className="p-1 text-slate-400 hover:text-slate-700 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end={item.end}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin Identity & Quick Signout */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/70">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
              View Storefront
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              Live
            </span>
          </Link>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">
                {user?.role}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Admin Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 hidden sm:inline">
              Zippy Backoffice Control Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 hidden md:inline">
              Logged in as <strong className="text-slate-900">{user?.email}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </header>

        {/* Dynamic Page Outlet with Suspense */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Suspense fallback={<AdminLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Global Admin Notifications */}
      <ToastContainer />
    </div>
  );
};

export default AdminLayout;
