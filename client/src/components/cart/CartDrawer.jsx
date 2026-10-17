// client/src/components/cart/CartDrawer.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Tag, ArrowRight, Sparkles, Truck, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../hooks/useCart.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input } from '../ui/index.js';
import { AddToCartButton } from '../common/AddToCartButton.jsx';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const { isCartDrawerOpen, toggleCartDrawer } = useUIStore();
  const {
    items,
    subtotal,
    totalMrp,
    discount,
    deliveryFee,
    grandTotal,
    coupon,
    isFreeDelivery,
    amountNeededForFreeDelivery,
    totalItemCount,
    applyCoupon,
    removeCoupon,
    isMutating,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!isCartDrawerOpen) return null;

  const freeDeliveryThreshold = 199;
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));
  const totalSavings = totalMrp - subtotal + (discount || 0);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setIsApplyingCoupon(true);
      await applyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCheckoutClick = () => {
    toggleCartDrawer(false);
    navigate('/checkout');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-heading"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => toggleCartDrawer(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-transparent dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div>
                <h2
                  id="cart-drawer-heading"
                  className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight"
                >
                  My Cart
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in basket
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleCartDrawer(false)}
              aria-label="Close cart drawer"
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Free Delivery Target Indicator */}
            {items.length > 0 && (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {isFreeDelivery ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
                        Unlocked FREE Delivery!
                      </span>
                    ) : (
                      `Add ₹${amountNeededForFreeDelivery} more for FREE Delivery`
                    )}
                  </span>
                  <span className="font-extrabold">{progressPercent}%</span>
                </div>

                <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">
                  Your cart is empty
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                  Good food is always just 10 minutes away. Fill your basket with daily essentials!
                </p>
                <Button variant="primary" onClick={() => toggleCartDrawer(false)}>
                  Start Shopping
                </Button>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    Basket Items
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-2">
                    {items.map((item) => (
                      <div
                        key={item.variantSku}
                        className="py-3 px-2 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-contain rounded-lg bg-white dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {item.unit}
                            </p>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                              ₹{item.price}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <AddToCartButton
                            productId={item.productId}
                            variant={{
                              sku: item.variantSku,
                              unit: item.unit,
                              price: item.price,
                              stock: 50,
                            }}
                            size="sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coupon Code Block */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Tag className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Apply Promo Coupon</span>
                  </div>

                  {coupon ? (
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-800 rounded-xl p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-black text-xs rounded border border-brand-200 dark:border-brand-800">
                          {coupon.code}
                        </span>
                        <span className="text-xs text-brand-700 dark:text-brand-300 font-bold">
                          -₹{discount} OFF
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCoupon()}
                        disabled={isMutating}
                        className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 p-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. WELCOME50"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="uppercase text-xs"
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="md"
                        isLoading={isApplyingCoupon}
                        disabled={!couponInput.trim()}
                      >
                        Apply
                      </Button>
                    </form>
                  )}
                </div>

                {/* Bill Details Summary */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm pb-1 border-b border-slate-100 dark:border-slate-700">
                    Bill Summary
                  </h4>

                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Items Total (MRP)</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      ₹{totalMrp}
                    </span>
                  </div>

                  {totalMrp > subtotal && (
                    <div className="flex justify-between text-brand-700 dark:text-brand-400 font-medium">
                      <span>Product Discount</span>
                      <span>-₹{totalMrp - subtotal}</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="flex justify-between text-brand-700 dark:text-brand-400 font-medium">
                      <span>Coupon Discount</span>
                      <span>-₹{discount}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      Delivery Charge
                      {isFreeDelivery && (
                        <span className="text-[10px] text-brand-700 dark:text-brand-400 font-black uppercase">
                          FREE
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {isFreeDelivery ? '₹0' : `₹${deliveryFee}`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black text-slate-900 dark:text-slate-100">
                    <span>Grand Total</span>
                    <span>₹{grandTotal}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 text-brand-800 dark:text-brand-300 font-bold text-xs p-2 rounded-xl text-center flex items-center justify-center gap-1.5 mt-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 fill-brand-600 dark:fill-brand-400" />
                      <span>You saved ₹{totalSavings} on this order!</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sticky Checkout Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCheckoutClick}
                className="w-full flex items-center justify-between text-base"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-normal text-emerald-100">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="font-black">₹{grandTotal}</span>
                </div>
                <div className="flex items-center gap-1 font-black">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
