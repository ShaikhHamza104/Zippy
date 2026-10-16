// client/src/pages/admin/AdminCouponsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Edit2, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
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

export const AdminCouponsPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const initialFormState = {
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '0',
    maxDiscountAmount: '',
    usageLimit: '',
    validUntil: '',
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Fetch Coupons
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/coupons');
      return res?.data?.coupons || [];
    },
  });

  const coupons = data || [];

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    // Default validUntil: 30 days from now
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      ...initialFormState,
      validUntil: nextMonth,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    const dateFormatted = coupon.validUntil
      ? new Date(coupon.validUntil).toISOString().split('T')[0]
      : '';

    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue?.toString() || '',
      minOrderAmount: coupon.minOrderAmount?.toString() || '0',
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
      usageLimit: coupon.usageLimit?.toString() || '',
      validUntil: dateFormatted,
      isActive: coupon.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Mutation: Save Coupon (Create or Update)
  const saveCouponMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCoupon) {
        return apiFetch(`/api/v1/admin/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiFetch('/api/v1/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      addToast({
        type: 'success',
        title: editingCoupon ? 'Coupon updated' : 'Coupon created',
        message: `Saved promotion code ${formData.code.toUpperCase()}`,
      });
      setIsModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'Unable to save coupon.',
      });
    },
  });

  // Handle Form Submit
  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      addToast({ type: 'warning', title: 'Validation error', message: 'Coupon code is required.' });
      return;
    }
    const val = parseFloat(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'Valid discount value is required.',
      });
      return;
    }
    if (!formData.validUntil) {
      addToast({ type: 'warning', title: 'Validation error', message: 'Expiry date is required.' });
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: val,
      minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
      maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      validUntil: new Date(formData.validUntil).toISOString(),
      isActive: formData.isActive,
    };

    saveCouponMutation.mutate(payload);
  };

  // Mutation: Delete Coupon
  const deleteCouponMutation = useMutation({
    mutationFn: async (id) => {
      return apiFetch(`/api/v1/admin/coupons/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      addToast({
        type: 'info',
        title: 'Coupon deleted',
        message: res?.message || 'Promotion coupon removed.',
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: err.message || 'Unable to delete coupon.',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Promotional Coupons & Discounts
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Create percentage or flat discounts, enforce minimum order thresholds, and monitor
            redemption limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminCoupons'] })}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Coupons Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Tag}
              title="No active coupons"
              description="Create promotional coupon codes to delight customers with instant discounts."
              actionLabel="Create Coupon"
              onAction={handleOpenCreateModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Coupon Code</th>
                  <th className="px-5 py-3.5">Discount Offer</th>
                  <th className="px-5 py-3.5">Min Order</th>
                  <th className="px-5 py-3.5">Redemption Limit</th>
                  <th className="px-5 py-3.5">Validity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.validUntil) < new Date();

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-slate-900 bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg">
                          {coupon.code}
                        </span>
                      </td>

                      {/* Offer */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1">
                          {coupon.discountType === 'PERCENTAGE' ? (
                            <>
                              <span>{coupon.discountValue}% OFF</span>
                              {coupon.maxDiscountAmount && (
                                <span className="text-slate-400 font-normal">
                                  (Up to ₹{coupon.maxDiscountAmount})
                                </span>
                              )}
                            </>
                          ) : (
                            <span>₹{coupon.discountValue} FLAT OFF</span>
                          )}
                        </div>
                      </td>

                      {/* Min Order */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-800">
                        {coupon.minOrderAmount > 0 ? `₹${coupon.minOrderAmount}` : 'No Minimum'}
                      </td>

                      {/* Usages */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                        <span className="font-bold text-slate-900">
                          {coupon._count?.usages ?? 0}
                        </span>{' '}
                        used / {coupon.usageLimit ? `${coupon.usageLimit} max` : 'Unlimited'}
                      </td>

                      {/* Validity */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span
                            className={
                              isExpired ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'
                            }
                          >
                            {new Date(coupon.validUntil).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {isExpired && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1 rounded font-bold">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={coupon.isActive && !isExpired ? 'success' : 'neutral'}
                          size="sm"
                          icon={
                            coupon.isActive && !isExpired ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-slate-400" />
                            )
                          }
                        >
                          {coupon.isActive && !isExpired ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(coupon)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete promotion coupon "${coupon.code}"?`)) {
                                deleteCouponMutation.mutate(coupon.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ======================================================================
          CREATE / EDIT COUPON MODAL
         ====================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promotion Coupon'}
        description="Configure discount rules, thresholds, and validity terms."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 p-6 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
            <Input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. ZIPPY50"
              className="text-xs h-10 font-mono font-bold uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="PERCENTAGE">PERCENTAGE (%)</option>
                <option value="FLAT">FLAT (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {formData.discountType === 'PERCENTAGE'
                  ? 'Discount Percentage (%) *'
                  : 'Flat Amount (₹) *'}
              </label>
              <Input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 50'}
                className="text-xs h-10 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Min Order Amount (₹)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                placeholder="0"
                className="text-xs h-10"
              />
            </div>

            {formData.discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Discount Cap (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="e.g. 100 (Optional)"
                  className="text-xs h-10"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usage Limit (Count)
              </label>
              <Input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="e.g. 500 (Blank = unlimited)"
                className="text-xs h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valid Until Date *
              </label>
              <Input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="text-xs h-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="couponActiveCheck"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <label
              htmlFor="couponActiveCheck"
              className="text-xs font-bold text-slate-800 cursor-pointer"
            >
              Coupon is Active and Redeemable at Checkout
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveCouponMutation.isLoading}
            >
              {editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCouponsPage;
