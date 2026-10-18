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
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
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
              <thead className="hidden sm:table-header-group">
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider whitespace-nowrap">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300 block sm:table-row-group">
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
                      className="block sm:table-row p-4 sm:p-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors border-b sm:border-b-0 border-slate-100 dark:border-slate-800 space-y-2.5 sm:space-y-0"
                    >
                      {/* Order Number */}
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Order
                        </span>
                        <span>{order.orderNumber}</span>
                      </td>

                      {/* Date */}
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Date
                        </span>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="flex sm:table-cell flex-col sm:flex-row justify-between sm:px-5 sm:py-3.5">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                          Customer
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {order.user?.name || 'Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {order.user?.phone || order.user?.email}
                          </div>
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 whitespace-nowrap">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Items
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {order.items?.length || 0} items
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Total Amount
                        </span>
                        <span>₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
                      </td>

                      {/* Payment */}
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 whitespace-nowrap">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Payment
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            order.payment?.status === 'SUCCESS'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
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
                      <td className="flex sm:table-cell items-center justify-between sm:px-5 sm:py-3.5 whitespace-nowrap">
                        <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                          Status
                        </span>
                        <Badge
                          variant={statusConfig.variant}
                          size="sm"
                          icon={<StatusIcon className="w-3 h-3" />}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="pt-2 sm:pt-0 sm:px-5 sm:py-3.5 text-right whitespace-nowrap border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(order.id)}
                            className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 flex-1 sm:flex-none justify-center"
                            title="View Full Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {allowedTransitions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(order)}
                              className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 flex-1 sm:flex-none justify-center"
                              title="Update Fulfillment Status"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Update</span>
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
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
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
          <div className="p-4 sm:p-6 space-y-4 animate-pulse">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-6 max-h-[82vh] overflow-y-auto text-xs text-slate-800 dark:text-slate-200">
            {/* Customer & Status Header */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Customer
                </span>
                <div className="font-black text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                  {detailData.user?.name || 'Customer'}
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                  {detailData.user?.phone || 'No phone'}
                </div>
                <div className="text-slate-600 dark:text-slate-400 break-all text-[11px]">
                  {detailData.user?.email}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
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
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                  {new Date(detailData.createdAt).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Payment
                </span>
                <div className="font-black text-slate-900 dark:text-slate-100 mt-0.5">
                  {detailData.payment?.method || 'COD'} ({detailData.payment?.status || 'PENDING'})
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Transaction:{' '}
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {detailData.payment?.id
                      ? `${detailData.payment.id.substring(0, 10)}...`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {(() => {
              const rawAddr =
                detailData.deliveryAddress || detailData.deliveryAddressSnapshot || {};
              const address =
                typeof rawAddr === 'string'
                  ? (() => {
                      try {
                        return JSON.parse(rawAddr);
                      } catch {
                        return {};
                      }
                    })()
                  : rawAddr;
              return (
                <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-slate-100 text-xs">
                    <MapPin className="w-4 h-4 text-brand-600 dark:text-emerald-400 shrink-0" />
                    <span>Delivery Address ({address?.type || 'Home'})</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed">
                    {[
                      address?.fullName || address?.name,
                      address?.addressLine1 || address?.line1,
                      address?.addressLine2 || address?.line2,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    {address?.city ? `, ${address?.city}` : ''}
                    {address?.state ? `, ${address?.state}` : ''}
                    {address?.pincode ? (
                      <>
                        {' - '}
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">
                          {address?.pincode}
                        </strong>
                      </>
                    ) : null}
                  </p>
                  {(address?.phone || detailData.user?.phone) && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium pt-0.5">
                      Contact: {address?.phone || detailData.user?.phone}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Line Items */}
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wider text-[11px]">
                Order Items ({detailData.items?.length || 0})
              </h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Item</th>
                      <th className="px-4 py-2.5">Price</th>
                      <th className="px-4 py-2.5">Qty</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 block sm:table-row-group">
                    {detailData.items?.map((item) => {
                      const itemName =
                        item.nameSnapshot || item.productName || item.name || 'Grocery Item';
                      const itemPrice = Number(item.priceSnapshot ?? item.price ?? 0);
                      const itemSubtotal = Number(
                        item.totalPrice ??
                          item.totalSnapshot ??
                          item.itemTotal ??
                          itemPrice * item.quantity
                      );
                      return (
                        <tr
                          key={item.id}
                          className="block sm:table-row p-3 sm:px-4 sm:py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 space-y-1 sm:space-y-0"
                        >
                          <td className="block sm:table-cell pb-1 sm:pb-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {itemName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              ID: {item.mongoProductId || item.productId}
                            </div>
                          </td>
                          <td className="flex sm:table-cell items-center justify-between sm:px-4 sm:py-2.5 font-bold text-slate-800 dark:text-slate-200">
                            <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                              Unit Price
                            </span>
                            <span>₹{itemPrice.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="flex sm:table-cell items-center justify-between sm:px-4 sm:py-2.5 font-bold text-slate-900 dark:text-slate-100">
                            <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                              Quantity
                            </span>
                            <span>{item.quantity}</span>
                          </td>
                          <td className="flex sm:table-cell items-center justify-between sm:px-4 sm:py-2.5 font-black text-slate-900 dark:text-slate-100 sm:text-right">
                            <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase">
                              Subtotal
                            </span>
                            <span>₹{itemSubtotal.toLocaleString('en-IN')}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-bold">
                  ₹{Number(detailData.subtotal).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Delivery Fee</span>
                <span className="font-bold">
                  ₹{Number(detailData.deliveryFee).toLocaleString('en-IN')}
                </span>
              </div>
              {Number(detailData.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{Number(detailData.discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-slate-900 dark:text-slate-100 text-sm">
                <span>Total Amount</span>
                <span>₹{Number(detailData.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Cancellation Reason if cancelled */}
            {detailData.status === 'CANCELLED' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-800 dark:text-rose-300 space-y-0.5">
                <span className="font-bold block">Cancellation Note:</span>
                <p className="text-[11px] font-medium">
                  {detailData.cancellationReason || 'No reason provided.'}
                </p>
              </div>
            )}

            {/* Prominent Modal Bottom Close Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full py-2.5 text-xs font-bold justify-center"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close Details
              </Button>
            </div>
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
