// client/src/pages/admin/AdminDashboardPage.jsx
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Users,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Package,
} from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { Button, Card, Badge, Skeleton, EmptyState } from '../../components/ui/index.js';

export const AdminDashboardPage = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/dashboard');
      return res?.data;
    },
    staleTime: 30 * 1000,
  });

  const stats = data?.stats || {};
  const statusBreakdown = stats?.orderStatusBreakdown || {
    PLACED: 0,
    PACKED: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  const lowStockAlerts = data?.lowStockAlerts || [];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load dashboard metrics"
          description={
            error?.message || 'An error occurred while fetching real-time backoffice stats.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const kpis = [
    {
      label: "Today's Orders",
      value: stats.ordersToday ?? 0,
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      label: "Today's Revenue",
      value: `₹${Number(stats.todayRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      label: 'Total Revenue',
      value: `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      label: 'Active Customers',
      value: stats.activeCustomers ?? 0,
      icon: Users,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
  ];

  const statusConfigs = [
    {
      key: 'PLACED',
      label: 'Placed',
      count: statusBreakdown.PLACED ?? 0,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      key: 'PACKED',
      label: 'Packed',
      count: statusBreakdown.PACKED ?? 0,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      key: 'OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      count: statusBreakdown.OUT_FOR_DELIVERY ?? 0,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      key: 'DELIVERED',
      label: 'Delivered',
      count: statusBreakdown.DELIVERED ?? 0,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      key: 'CANCELLED',
      label: 'Cancelled',
      count: statusBreakdown.CANCELLED ?? 0,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Real-time quick-commerce revenue, dark store inventory alerts, and order lifecycle
            status.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })}
          disabled={isFetching}
          leftIcon={<RotateCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          {isFetching ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</div>
              </div>
              <div className={`p-3 rounded-2xl border ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Order Status Breakdown */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Order Fulfillment Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Live order distribution across fulfillment stages
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            Manage Orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statusConfigs.map((status) => (
            <div
              key={status.key}
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${status.color}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                {status.label}
              </span>
              <span className="text-2xl font-black mt-2 tracking-tight">{status.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Low-Stock Inventory Alerts */}
      <Card className="overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Low-Stock Inventory Alerts
                </h2>
                <Badge variant={lowStockAlerts.length > 0 ? 'danger' : 'success'} size="sm">
                  {lowStockAlerts.length} Critical
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Variants with stock level ≤ 10 units needing dark store replenishment
              </p>
            </div>
          </div>

          <Link to="/admin/products">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Inventory Control
            </Button>
          </Link>
        </div>

        {lowStockAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">
              All dark store inventory levels are healthy!
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              No products currently have stock ≤ 10 units.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Product & Brand</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Unit</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Remaining Stock</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {lowStockAlerts.map((item) => (
                  <tr
                    key={`${item.productId}-${item.sku}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.brand}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 font-bold">{item.sku}</td>
                    <td className="px-5 py-3.5">{item.unit}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                          item.stock === 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.stock === 0 ? 'Out of Stock' : `${item.stock} left`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/admin/products?search=${encodeURIComponent(item.sku)}`}
                        className="text-brand-600 hover:text-brand-700 font-bold hover:underline"
                      >
                        Update Stock
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
