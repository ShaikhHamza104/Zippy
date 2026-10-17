// client/src/pages/orders/OrderDetailPage.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, MapPin, XCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Badge, Skeleton, Modal } from '../../components/ui/index.js';

const STATUS_STEPS = [
  { key: 'PLACED', label: 'Order Placed', desc: 'Received at dark store' },
  { key: 'PACKED', label: 'Order Packed', desc: 'Bag sealed by picker' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider on the way' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Safely dropped off' },
];

export const OrderDetailPage = () => {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [cancelError, setCancelError] = useState('');

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/orders/${orderId}`);
      return res?.data?.order;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 8s while order is active, stop when terminal
      return status === 'DELIVERED' || status === 'CANCELLED' ? false : 8000;
    },
  });

  const order = orderData;

  const cancelOrderMutation = useMutation({
    mutationFn: async (reason) => {
      const res = await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: reason }),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCancelModalOpen(false);
      addToast({
        type: 'info',
        title: 'Order cancelled',
        message: 'Your order was cancelled and inventory has been restored.',
      });
    },
    onError: (err) => {
      setCancelError(err.message || 'Cannot cancel order in its current status.');
    },
  });

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    await cancelOrderMutation.mutateAsync(cancelReason.trim());
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <Link to="/orders">
          <Button variant="primary">View My Orders</Button>
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const canCancel = order.status === 'PLACED' || order.status === 'PACKED';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const deliveryAddress = order.deliveryAddressSnapshot || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <Link
            to="/orders"
            className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Orders
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200">#{order.orderNumber}</span>
        </div>

        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setIsCancelModalOpen(true)}>
            Cancel Order
          </Button>
        )}
      </div>

      {/* Status Progress Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <Badge variant={isCancelled ? 'danger' : 'success'} size="md">
            {order.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {isCancelled ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-red-900 dark:text-red-200">
                This order was cancelled
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Reason: {order.cancellationReason || 'Cancelled by customer'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
              {STATUS_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all ${
                        isCurrent
                          ? 'bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-sm'
                          : isPassed
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isPassed
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Immutable Items Snapshot + Address / Payment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Item Snapshots */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
            Ordered Items ({order.items?.length || 0})
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items?.map((it) => (
              <div key={it.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {it.productImage ? (
                    <img
                      src={it.productImage}
                      alt={it.productName}
                      className="w-12 h-12 object-contain rounded-lg bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">
                      {it.productName}
                    </h4>
                    <span className="text-slate-400 dark:text-slate-400 font-medium">
                      {it.unit} • ₹{it.price} each
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                    Qty: {it.quantity}
                  </span>
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                    ₹{it.itemTotal || it.price * it.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Address & Payment Breakdown */}
        <div className="space-y-4">
          {/* Delivery Address Snapshot */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              Delivery Address
            </h3>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {deliveryAddress.fullName}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {deliveryAddress.addressLine1}
              {deliveryAddress.addressLine2 && `, ${deliveryAddress.addressLine2}`}
              <br />
              {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 pt-1">
              Phone: {deliveryAddress.phone}
            </p>
          </div>

          {/* Bill Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <h3 className="font-black text-slate-900 dark:text-slate-100 pb-1 border-b border-slate-100 dark:border-slate-800">
              Payment Breakdown
            </h3>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                ₹{order.subtotal}
              </span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-brand-700 font-semibold">
                <span>Discount</span>
                <span>-₹{order.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-medium text-slate-800">
                {Number(order.deliveryFee) === 0 ? 'FREE' : `₹${order.deliveryFee}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
              <span>Total Paid</span>
              <span>₹{order.totalAmount}</span>
            </div>
            <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Method:</span>
              <span className="font-bold uppercase text-slate-700">{order.paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel This Order"
        description="Are you sure you want to cancel? Items will be returned to dark store inventory."
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          {cancelError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Cancellation
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-brand-500"
            >
              <option value="Change of plans">Change of plans</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Items not needed immediately">Items not needed immediately</option>
              <option value="Need to change delivery address">
                Need to change delivery address
              </option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCancelModalOpen(false)}>
              Keep Order
            </Button>
            <Button type="submit" variant="danger" isLoading={cancelOrderMutation.isPending}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
