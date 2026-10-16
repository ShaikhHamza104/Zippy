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

  const cart = cartData || {
    items: [],
    subtotal: 0,
    totalMrp: 0,
    discount: 0,
    deliveryFee: 15,
    grandTotal: 0,
    coupon: null,
    isFreeDelivery: false,
    amountNeededForFreeDelivery: 199,
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
      addToast({
        type: 'success',
        title: 'Coupon applied!',
        message: `Saved ₹${data.discount || 0} with coupon`,
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
    subtotal: cart.subtotal || 0,
    totalMrp: cart.totalMrp || 0,
    discount: cart.discount || 0,
    deliveryFee: cart.deliveryFee !== undefined ? cart.deliveryFee : 15,
    grandTotal: cart.grandTotal || 0,
    coupon: cart.coupon || null,
    isFreeDelivery: Boolean(cart.isFreeDelivery),
    amountNeededForFreeDelivery: cart.amountNeededForFreeDelivery || 0,
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
