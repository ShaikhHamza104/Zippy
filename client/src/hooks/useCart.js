// client/src/hooks/useCart.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useUIStore } from '../stores/uiStore.js';

export const CART_QUERY_KEY = ['cart'];

export const useCart = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const {
    data: cartData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/v1/cart');
      return res?.data || null;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const pricing = cartData?.pricing || {};
  const subtotal = cartData?.subtotal ?? pricing.subtotal ?? 0;
  const totalMrp = cartData?.totalMrp ?? pricing.totalMrp ?? (subtotal || 0);
  const discount = cartData?.discount ?? pricing.discountAmount ?? 0;
  const deliveryFee =
    cartData?.deliveryFee !== undefined
      ? cartData.deliveryFee
      : pricing.deliveryFee !== undefined
        ? pricing.deliveryFee
        : subtotal >= 199 || subtotal === 0
          ? 0
          : 15;
  const grandTotal =
    cartData?.grandTotal ?? pricing.totalAmount ?? Math.max(0, subtotal - discount + deliveryFee);
  const coupon = cartData?.coupon || cartData?.appliedCoupon || null;
  const isFreeDelivery = deliveryFee === 0 && subtotal > 0;
  const amountNeededForFreeDelivery =
    cartData?.amountNeededForFreeDelivery ??
    pricing.amountNeededForFreeDelivery ??
    Math.max(0, 199 - subtotal);
  const totalSavings =
    cartData?.totalSavings ?? pricing.totalSavings ?? Math.max(0, totalMrp - subtotal + discount);

  const cart = {
    items: cartData?.items || [],
    subtotal,
    totalMrp,
    discount,
    deliveryFee,
    grandTotal,
    coupon,
    isFreeDelivery,
    amountNeededForFreeDelivery,
    totalSavings,
    pricing,
    ...cartData,
  };

  // Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ productId, variantSku, quantity = 1 }) => {
      const res = await apiFetch('/api/v1/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, variantSku, quantity }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
      addToast({
        type: 'success',
        title: 'Item added',
        message: 'Added to your quick delivery basket',
        duration: 2500,
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Could not add item',
        message: err.message || 'Item is out of stock or unavailable',
      });
    },
  });

  // Update Item Quantity Mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ variantSku, quantity }) => {
      if (quantity <= 0) {
        const res = await apiFetch(`/api/v1/cart/items/${variantSku}`, {
          method: 'DELETE',
        });
        return res.data;
      }
      const res = await apiFetch(`/api/v1/cart/items/${variantSku}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      addToast({
        type: 'error',
        title: 'Stock limit reached',
        message: err.message || 'Cannot add more units of this item',
      });
    },
  });

  // Remove Item Mutation
  const removeItemMutation = useMutation({
    mutationFn: async (variantSku) => {
      const res = await apiFetch(`/api/v1/cart/items/${variantSku}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      addToast({
        type: 'error',
        title: 'Cart error',
        message: err.message,
      });
    },
  });

  // Apply Coupon Mutation
  const applyCouponMutation = useMutation({
    mutationFn: async (code) => {
      const res = await apiFetch('/api/v1/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
      const savedAmount =
        data.discount ?? data.pricing?.discountAmount ?? data.appliedCoupon?.discountAmount ?? 0;
      addToast({
        type: 'success',
        title: 'Coupon applied!',
        message: `Saved ₹${savedAmount} with coupon`,
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Invalid Coupon',
        message: err.message || 'Coupon could not be applied',
      });
    },
  });

  // Remove Coupon Mutation
  const removeCouponMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/v1/cart/coupon', {
        method: 'DELETE',
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data);
      addToast({
        type: 'info',
        title: 'Coupon removed',
        message: 'The coupon has been detached from your cart',
      });
    },
  });

  // Helper to query quantity of a specific SKU in cart
  const getItemQuantity = (variantSku) => {
    if (!cart?.items) return 0;
    const item = cart.items.find((it) => it.variantSku === variantSku);
    return item ? item.quantity : 0;
  };

  // Helper to count total units across all items
  const totalItemCount = cart?.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

  return {
    cart,
    items: cart.items || [],
    subtotal,
    totalMrp,
    discount,
    deliveryFee,
    grandTotal,
    coupon,
    isFreeDelivery,
    amountNeededForFreeDelivery,
    totalSavings,
    totalItemCount,
    isLoading,
    isError,
    error,
    refetch,
    addItem: (productId, variantSku, quantity = 1) =>
      addItemMutation.mutateAsync({ productId, variantSku, quantity }),
    updateQuantity: (variantSku, quantity) =>
      updateQuantityMutation.mutateAsync({ variantSku, quantity }),
    removeItem: (variantSku) => removeItemMutation.mutateAsync(variantSku),
    applyCoupon: (code) => applyCouponMutation.mutateAsync(code),
    removeCoupon: () => removeCouponMutation.mutateAsync(),
    getItemQuantity,
    isMutating:
      addItemMutation.isPending ||
      updateQuantityMutation.isPending ||
      removeItemMutation.isPending ||
      applyCouponMutation.isPending,
  };
};

export default useCart;
