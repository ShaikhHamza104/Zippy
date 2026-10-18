// client/src/pages/orders/OrderSuccessPage.jsx
import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MapPin, ArrowRight, Zap } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { Button, Skeleton } from '../../components/ui/index.js';

export const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const location = useLocation();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/orders/${orderId}`);
      return res?.data?.order;
    },
    initialData: location.state?.order,
  });

  const order = orderData;

  if (isLoading && !order) {
    return (
      <div className="py-20 max-w-md mx-auto space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  const rawAddress = order?.deliveryAddressSnapshot || order?.deliveryAddress || {};
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
    <div className="min-h-[70vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-floating border border-slate-100 dark:border-slate-800 p-6 sm:p-8 text-center space-y-6">
        {/* Celebration Graphic */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </span>
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-emerald-50 dark:bg-brand-950/60 px-3 py-1 rounded-full">
            Order Confirmed
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
            Order Placed Successfully!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Order #{order?.orderNumber || orderId} has been received and confirmed.
          </p>
        </div>

        {/* Delivery Details Card */}
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-left space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Order Status</span>
            <span className="font-extrabold text-brand-700 dark:text-brand-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmed
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Method</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
              {order?.payment?.method || order?.paymentMethod || 'COD'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Amount To Pay</span>
            <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
              ₹{order?.totalAmount}
            </span>
          </div>

          <div className="pt-1 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300 line-clamp-2">
              {[deliveryAddress.addressLine1 || deliveryAddress.line1, deliveryAddress.city]
                .filter(Boolean)
                .join(', ')}
              {deliveryAddress.pincode ? ` - ${deliveryAddress.pincode}` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link to={`/orders/${orderId}`} className="block">
            <Button variant="primary" size="lg" className="w-full text-sm font-black">
              <span>View Order Details</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>

          <Link to="/" className="block">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
