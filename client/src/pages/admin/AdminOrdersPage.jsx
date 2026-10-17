// client/src/pages/admin/AdminOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  X,
  Eye,
  RefreshCw,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useUIStore } from '../../stores/uiStore.js';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  Skeleton,
  EmptyState,
} from '../../components/ui/index.js';

const ALLOWED_NEXT_STATUS = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_BADGE_VARIANTS = {
  PLACED: { variant: 'warning', label: 'Placed', icon: Clock },
  PACKED: { variant: 'brand', label: 'Packed', icon: Package },
  OUT_FOR_DELIVERY: { variant: 'accent', label: 'Out for Delivery', icon: Truck },
  DELIVERED: { variant: 'success', label: 'Delivered', icon: CheckCircle2 },
  CANCELLED: { variant: 'danger', label: 'Cancelled', icon: XCircle },
};

export const AdminOrdersPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const statusFilter = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(search);

  // Modals state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // 1. Fetch Orders List
  const {
    data: ordersData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['adminOrders', { page, statusFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await apiFetch(`/api/v1/admin/orders?${params.toString()}`);
      return res;
    },
    keepPreviousData: true,
  });

  const orders = ordersData?.data?.orders || [];
  const pagination = ordersData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // 2. Fetch Single Order Details when modal is opened
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['adminOrderDetail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await apiFetch(`/api/v1/admin/orders/${selectedOrderId}`);
      return res?.data?.order;
    },
    enabled: !!selectedOrderId && isDetailModalOpen,
  });

  // Keep search input in sync if URL query parameter changes
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Handle Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Clear search immediately
  const handleClearSearch = () => {
    setSearchInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Reset all filters & search
  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // Handle Status Filter
  const handleStatusFilterChange = (status) => {
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Page change
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  // Open Details Modal
  const handleOpenDetailModal = (orderId) => {
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  // Open Status Transition Modal
  const handleOpenStatusModal = (order) => {
    setOrderToUpdate(order);
    const allowed = ALLOWED_NEXT_STATUS[order.status] || [];
    setTargetStatus(allowed[0] || '');
    setCancellationReason('');
    setIsStatusModalOpen(true);
  };

  // Mutation: Update Order Status
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        status: targetStatus,
      };
      if (targetStatus === 'CANCELLED') {
        payload.cancellationReason = cancellationReason.trim() || 'Cancelled by admin';
      }

      return apiFetch(`/api/v1/admin/orders/${orderToUpdate.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderDetail', orderToUpdate?.id] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order #${orderToUpdate.orderNumber} transitioned to ${targetStatus}.`,
      });
      setIsStatusModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Status update failed',
        message: err.message || 'Unable to transition order status.',
      });
    },
  });

  const statusTabs = [
    { label: 'All Orders', value: '' },
    { label: 'Placed', value: 'PLACED' },
    { label: 'Packed', value: 'PACKED' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Track customer orders, advance delivery stages, inspect line-item snapshots, and process
            cancellations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['adminOrders'] })}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh Orders
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusFilterChange(tab.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <Card className="p-3 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by Order #, customer name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                rightIcon={
                  searchInput ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Clear search"
                      aria-label="Clear search input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null
                }
                className="h-10 text-xs"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="h-10">
              Search
            </Button>
            {(search || statusFilter) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs whitespace-nowrap"
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            )}
          </form>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={ShoppingBag}
              title="No orders found"
              description="No orders match your filter criteria or search keyword."
              actionLabel="Clear Filters"
              onAction={handleResetFilters}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="px-5 py-3.5">Order #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Fulfillment Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {orders.map((order) => {
                  const statusConfig = STATUS_BADGE_VARIANTS[order.status] || {
                    variant: 'neutral',
                    label: order.status,
                    icon: AlertCircle,
                  };
                  const StatusIcon = statusConfig.icon;
                  const allowedTransitions = ALLOWED_NEXT_STATUS[order.status] || [];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
                    >
                      {/* Order Number */}
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {order.orderNumber}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {order.user?.name || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {order.user?.phone || order.user?.email}
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {order.items?.length || 0} items
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </td>

                      {/* Payment */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            order.payment?.status === 'SUCCESS'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <span>{order.payment?.method || 'COD'}</span>
                          <span>•</span>
                          <span className="text-[10px] uppercase font-mono">
                            {order.payment?.status || 'PENDING'}
                          </span>
                        </span>
                      </td>

                      {/* Fulfillment Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={statusConfig.variant}
                          size="sm"
                          icon={<StatusIcon className="w-3 h-3" />}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(order.id)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                            title="View Full Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </button>

                          {allowedTransitions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(order)}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                              title="Update Fulfillment Status"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Update</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div>
              Showing page{' '}
              <strong className="font-bold text-slate-900 dark:text-slate-100">
                {pagination.page}
              </strong>{' '}
              of{' '}
              <strong className="font-bold text-slate-900 dark:text-slate-100">
                {pagination.totalPages}
              </strong>{' '}
              ({pagination.total} orders)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ======================================================================
          ORDER DETAILS MODAL
         ====================================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailData ? `Order #${detailData.orderNumber}` : 'Order Details'}
        description="Line-item snapshots, customer delivery address, and payment information."
        maxWidth="max-w-2xl"
      >
        {isLoadingDetail || !detailData ? (
          <div className="p-6 space-y-4 animate-pulse">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5 p-6 max-h-[80vh] overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
            {/* Customer & Status Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">
                  Customer
                </span>
                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                  {detailData.user?.name}
                </div>
                <div className="text-slate-500 dark:text-slate-400">{detailData.user?.phone}</div>
                <div className="text-slate-400 dark:text-slate-500 truncate">
                  {detailData.user?.email}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">
                  Fulfillment
                </span>
                <div className="mt-1">
                  <Badge
                    variant={STATUS_BADGE_VARIANTS[detailData.status]?.variant || 'brand'}
                    size="sm"
                  >
                    {detailData.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(detailData.createdAt).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">
                  Payment
                </span>
                <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {detailData.payment?.method} ({detailData.payment?.status})
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transaction:{' '}
                  <span className="font-mono">{detailData.payment?.id?.substring(0, 8)}...</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-emerald-400" />
                <span>Delivery Address ({detailData.deliveryAddressSnapshot?.type || 'Home'})</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {detailData.deliveryAddressSnapshot?.line1}
                {detailData.deliveryAddressSnapshot?.line2 &&
                  `, ${detailData.deliveryAddressSnapshot?.line2}`}
                , {detailData.deliveryAddressSnapshot?.city},{' '}
                {detailData.deliveryAddressSnapshot?.state} -{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  {detailData.deliveryAddressSnapshot?.pincode}
                </strong>
              </p>
            </div>

            {/* Line Items Table */}
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider text-[11px]">
                Order Items ({detailData.items?.length || 0})
              </h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5">Price</th>
                      <th className="px-4 py-2.5">Qty</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailData.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.nameSnapshot}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            MongoID: {item.mongoProductId}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-bold">
                          ₹{Number(item.priceSnapshot).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 font-bold">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900 dark:text-slate-100">
                          ₹{Number(item.totalSnapshot).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>₹{Number(detailData.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery Fee</span>
                <span>₹{Number(detailData.deliveryFee).toLocaleString('en-IN')}</span>
              </div>
              {Number(detailData.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{Number(detailData.discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-slate-900 dark:text-slate-100 text-sm">
                <span>Total Paid</span>
                <span>₹{Number(detailData.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Cancellation Reason if cancelled */}
            {detailData.status === 'CANCELLED' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 space-y-0.5">
                <span className="font-bold block">Cancellation Note:</span>
                <p className="text-[11px]">
                  {detailData.cancellationReason || 'No reason provided.'}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======================================================================
          UPDATE ORDER STATUS MODAL
         ====================================================================== */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={orderToUpdate ? `Update Order #${orderToUpdate.orderNumber}` : 'Update Status'}
        description="Transition order to next logistics milestone or cancel with inventory rollback."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-6 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current Status
            </label>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-slate-800 dark:text-slate-200">
              {orderToUpdate?.status}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Next Status *
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(ALLOWED_NEXT_STATUS[orderToUpdate?.status] || []).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {targetStatus === 'CANCELLED' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                Cancellation Reason * (Inventory will be restored)
              </label>
              <textarea
                required
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation / Delivery partner unavailable..."
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={targetStatus === 'CANCELLED' ? 'danger' : 'primary'}
              size="sm"
              isLoading={updateStatusMutation.isLoading}
              onClick={() => updateStatusMutation.mutate()}
            >
              Confirm Transition
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOrdersPage;
