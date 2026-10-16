// client/src/pages/orders/OrdersListPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { Badge, Skeleton, EmptyState } from '../../components/ui/index.js';

const statusBadgeVariants = {
  PLACED: 'brand',
  PACKED: 'warning',
  OUT_FOR_DELIVERY: 'accent',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export const OrdersListPage = () => {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/orders');
      return res?.data?.orders || [];
    },
  });

  const orders = ordersData || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">My Orders</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          View your order history and track active 10-minute grocery deliveries.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <EmptyState
            title="No orders yet"
            description="You haven't placed any grocery orders yet. Discover essentials delivered in 10 minutes!"
            actionLabel="Start Shopping"
            onAction={() => (window.location.href = '/products')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-brand-300 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900">#{ord.orderNumber}</span>
                  <Badge variant={statusBadgeVariants[ord.status] || 'neutral'}>
                    {ord.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Items summary */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {ord.items?.slice(0, 4).map((it) => (
                    <div
                      key={it.id}
                      className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center overflow-hidden"
                      title={`${it.quantity}x ${it.productName}`}
                    >
                      {it.productImage ? (
                        <img
                          src={it.productImage}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                  ))}
                  {ord.items?.length > 4 && (
                    <span className="text-xs font-bold text-slate-400 px-1">
                      +{ord.items.length - 4} more
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-slate-900">₹{ord.totalAmount}</div>
                  <Link
                    to={`/orders/${ord.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 pt-1"
                  >
                    <span>Track Order</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersListPage;
