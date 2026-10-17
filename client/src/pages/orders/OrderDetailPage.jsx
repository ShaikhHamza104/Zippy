// client/src/pages/orders/OrderDetailPage.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPin, XCircle, ArrowLeft, ShoppingBag, Star } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Badge, Skeleton, Modal } from '../../components/ui/index.js';

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
  const rawAddress = order.deliveryAddressSnapshot || order.deliveryAddress || {};
  const deliveryAddress =
    typeof rawAddress === 'string'
      ? (() => {
          try {
            return JSON.parse(rawAddress);
          } catch {
            return {};
          }
        })()
      : rawAddress;

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

      {/* Order Status & Details Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Order Status:
            </span>
            <Badge
              variant={isCancelled ? 'danger' : order.status === 'DELIVERED' ? 'success' : 'brand'}
              size="md"
            >
              {order.status.replace(/_/g, ' ')}
            </Badge>
          </div>
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
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Fulfillment Status
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {order.status === 'PLACED' && 'Order Placed & Confirmed'}
              {order.status === 'PACKED' && 'Order Packed'}
              {order.status === 'OUT_FOR_DELIVERY' && 'Dispatched'}
              {order.status === 'DELIVERED' && 'Delivered'}
            </span>
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
            {order.items?.map((it) => {
              const productName = it.productName || it.nameSnapshot || it.name || 'Grocery Item';
              const productImage = it.productImage || it.imageSnapshot || it.image;
              const productId = it.productId || it.mongoProductId;
              const price = Number(it.priceSnapshot ?? it.price ?? 0);
              const quantity = Number(it.quantity || 1);
              const itemTotal = Number(it.totalPrice ?? it.itemTotal ?? price * quantity);

              return (
                <div
                  key={it.id || it.mongoProductId || it.nameSnapshot}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={productName}
                        className="w-12 h-12 object-contain rounded-lg bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      {productId ? (
                        <Link
                          to={`/products/${productId}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors block"
                        >
                          {productName}
                        </Link>
                      ) : (
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">
                          {productName}
                        </h4>
                      )}
                      <span className="text-slate-400 dark:text-slate-400 font-medium block">
                        {it.unit ? `${it.unit} • ` : ''}₹{price} each
                      </span>
                      {productId && (
                        <Link
                          to={`/products/${productId}`}
                          className="text-[11px] font-bold text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>Rate & Review</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                      Qty: {quantity}
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                      ₹{itemTotal}
                    </span>
                  </div>
                </div>
              );
            })}
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
            {(deliveryAddress.fullName || order.user?.name) && (
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {deliveryAddress.fullName || order.user?.name}
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {[
                deliveryAddress.addressLine1 || deliveryAddress.line1,
                deliveryAddress.addressLine2 || deliveryAddress.line2,
              ]
                .filter(Boolean)
                .join(', ')}
              {deliveryAddress.landmark && (
                <span className="block text-slate-400">Near: {deliveryAddress.landmark}</span>
              )}
              {(deliveryAddress.city || deliveryAddress.state || deliveryAddress.pincode) && (
                <>
                  <br />
                  {[deliveryAddress.city, deliveryAddress.state].filter(Boolean).join(', ')}
                  {deliveryAddress.pincode ? ` - ${deliveryAddress.pincode}` : ''}
                </>
              )}
            </p>
            {(deliveryAddress.phone || order.user?.phone) && (
              <p className="text-[11px] text-slate-400 dark:text-slate-400 pt-1">
                Phone: {deliveryAddress.phone || order.user?.phone}
              </p>
            )}
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
              <span className="text-slate-600 dark:text-slate-400">Delivery Fee</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {Number(order.deliveryFee) === 0 ? 'FREE' : `₹${order.deliveryFee}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black text-slate-900 dark:text-slate-100">
              <span>Total Paid</span>
              <span>₹{order.totalAmount}</span>
            </div>
            <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-400 flex items-center justify-between">
              <span>Method:</span>
              <span className="font-bold uppercase text-slate-700 dark:text-slate-300">
                {order.payment?.method || order.paymentMethod || 'COD'}
              </span>
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
