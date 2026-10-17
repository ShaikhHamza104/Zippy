// client/src/components/common/AddToCartButton.jsx
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '../../hooks/useCart.js';
import { cn } from '../../utils/cn.js';

export const AddToCartButton = ({
  productId,
  variant,
  className,
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  const { getItemQuantity, addItem, updateQuantity, isMutating } = useCart();

  const variantSku = variant?.sku;
  const stock = Number(variant?.stock ?? 0);
  const currentQty = variantSku ? getItemQuantity(variantSku) : 0;
  const isOutOfStock = stock <= 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isMutating || !variantSku) return;
    await addItem(productId, variantSku, 1);
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentQty >= stock || isMutating) return;
    await updateQuantity(variantSku, currentQty + 1);
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentQty <= 0 || isMutating) return;
    await updateQuantity(variantSku, currentQty - 1);
  };

  if (isOutOfStock) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold text-xs uppercase tracking-wider rounded-xl',
          'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none px-3 py-1.5',
          className
        )}
      >
        Out of Stock
      </span>
    );
  }

  // Not in cart: Render clean "ADD" button
  if (currentQty === 0) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={isMutating}
        aria-label={`Add ${variant?.unit || 'item'} to cart`}
        className={cn(
          'inline-flex items-center justify-center font-extrabold uppercase tracking-wider rounded-xl',
          'border border-brand-600 bg-emerald-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 dark:hover:text-white',
          'transition-all duration-150 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500',
          size === 'sm' && 'px-3 py-1 text-xs min-h-[34px]',
          size === 'md' && 'px-4 py-1.5 text-xs min-h-[38px]',
          size === 'lg' && 'px-6 py-2.5 text-sm min-h-[44px]',
          className
        )}
      >
        <span className="font-black text-sm mr-1">+</span> ADD
      </button>
    );
  }

  // In cart: Render Blinkit-style stepper
  return (
    <div
      role="group"
      aria-label="Item quantity stepper"
      className={cn(
        'inline-flex items-center justify-between bg-brand-600 text-white rounded-xl shadow-sm overflow-hidden select-none',
        size === 'sm' && 'min-h-[34px] text-xs',
        size === 'md' && 'min-h-[38px] text-xs',
        size === 'lg' && 'min-h-[44px] text-sm',
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isMutating}
        aria-label="Decrease quantity"
        className="px-2.5 py-1 hover:bg-brand-700 active:bg-brand-800 transition-colors focus:outline-none focus:bg-brand-700 flex items-center justify-center"
      >
        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <span aria-live="polite" className="px-2 font-black text-center min-w-[28px] tabular-nums">
        {currentQty}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={currentQty >= stock || isMutating}
        aria-label="Increase quantity"
        className={cn(
          'px-2.5 py-1 hover:bg-brand-700 active:bg-brand-800 transition-colors focus:outline-none focus:bg-brand-700 flex items-center justify-center',
          currentQty >= stock && 'opacity-40 cursor-not-allowed hover:bg-transparent'
        )}
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};

export default AddToCartButton;
