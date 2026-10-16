// client/src/pages/profile/ProfilePage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Lock, LogOut, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Button, Input, Modal, Badge } from '../../components/ui/index.js';

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[0-9!@#$%^&*]/, 'Must contain at least 1 number or special character'),
    confirmPassword: z.string().min(1, 'Please confirm new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, '10-digit mobile number required'),
  addressLine1: z.string().trim().min(5, 'Flat/house number & street required'),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Valid 6-digit PIN code required'),
  isDefault: z.boolean().optional(),
});

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState('addresses'); // 'addresses' | 'security' | 'account'
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressServerError, setAddressServerError] = useState('');
  const [passwordServerError, setPasswordServerError] = useState('');

  // Fetch Saved Addresses
  const { data: addressesData, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/addresses');
      return res?.data?.addresses || [];
    },
  });

  const addresses = addressesData || [];

  // Address creation form
  const {
    register: registerAddress,
    handleSubmit: handleSubmitAddress,
    reset: resetAddressForm,
    formState: { errors: addressErrors, isSubmitting: isSubmittingAddress },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      isDefault: false,
    },
  });

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
  });

  // Address Mutation: Add
  const addAddressMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await apiFetch('/api/v1/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setIsAddressModalOpen(false);
      resetAddressForm();
      addToast({
        type: 'success',
        title: 'Address saved',
        message: 'New delivery address added to your address book.',
      });
    },
    onError: (err) => {
      setAddressServerError(err.message || 'Failed to save address.');
    },
  });

  // Address Mutation: Delete
  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId) => {
      await apiFetch(`/api/v1/addresses/${addressId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      addToast({
        type: 'info',
        title: 'Address removed',
        message: 'The delivery address was removed.',
      });
    },
  });

  const onAddressSubmit = async (data) => {
    setAddressServerError('');
    await addAddressMutation.mutateAsync(data);
  };

  const onPasswordSubmit = async (data) => {
    try {
      setPasswordServerError('');
      await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      resetPasswordForm();
      addToast({
        type: 'success',
        title: 'Password updated',
        message: 'Your account password was updated successfully.',
      });
    } catch (err) {
      setPasswordServerError(err.message || 'Could not change password.');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Continue client-side clear
    } finally {
      clearAuth();
      addToast({
        type: 'info',
        title: 'Logged out',
        message: 'You have been safely signed out.',
      });
      window.location.href = '/';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {user?.name || 'Customer Account'}
              </h1>
              <Badge variant="brand">{user?.role || 'CUSTOMER'}</Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{user?.email}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-4 h-4 text-red-500" />}
          className="text-red-600 hover:bg-red-50 hover:border-red-200 self-start sm:self-auto"
        >
          Sign Out
        </Button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 flex items-center gap-2 transition-all ${
            activeTab === 'addresses'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Delivery Addresses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Tab: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">Saved Delivery Addresses</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddressModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add New Address
            </Button>
          </div>

          {isLoadingAddresses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
              <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No saved addresses</h3>
              <p className="text-xs text-slate-500 mb-4">
                Add an address so your 10-minute grocery orders arrive seamlessly.
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsAddressModalOpen(true)}>
                Add Your Address
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 relative shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{addr.fullName}</span>
                      {addr.isDefault && <Badge variant="success">DEFAULT</Badge>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAddressMutation.mutate(addr.id)}
                      aria-label={`Delete address ${addr.fullName}`}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.addressLine1}
                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                    <br />
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>

                  <div className="text-[11px] font-semibold text-slate-500">
                    Phone: {addr.phone}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Security & Password */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs max-w-lg space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your account password with at least 8 characters.
            </p>
          </div>

          {passwordServerError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold"
            >
              {passwordServerError}
            </div>
          )}

          <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
            <Input
              id="currentPassword"
              label="Current Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.currentPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...registerPassword('currentPassword')}
            />

            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.newPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...registerPassword('newPassword')}
            />

            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.confirmPassword?.message}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              {...registerPassword('confirmPassword')}
            />

            <Button type="submit" variant="primary" size="md" isLoading={isSubmittingPassword}>
              Update Password
            </Button>
          </form>
        </div>
      )}

      {/* Add Address Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Add New Delivery Address"
        description="Enter full delivery details for instant 10-minute order drop-off."
      >
        <form onSubmit={handleSubmitAddress(onAddressSubmit)} className="space-y-3.5">
          {addressServerError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {addressServerError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="fullName"
              label="Full Name"
              placeholder="John Doe"
              error={addressErrors.fullName?.message}
              {...registerAddress('fullName')}
            />
            <Input
              id="phone"
              label="10-Digit Mobile"
              placeholder="9876543210"
              error={addressErrors.phone?.message}
              {...registerAddress('phone')}
            />
          </div>

          <Input
            id="addressLine1"
            label="House/Flat No. & Street"
            placeholder="Flat 402, Sunshine Heights"
            error={addressErrors.addressLine1?.message}
            {...registerAddress('addressLine1')}
          />

          <Input
            id="addressLine2"
            label="Landmark / Area (Optional)"
            placeholder="Near Metro Station"
            error={addressErrors.addressLine2?.message}
            {...registerAddress('addressLine2')}
          />

          <div className="grid grid-cols-3 gap-2.5">
            <Input
              id="city"
              label="City"
              placeholder="Bengaluru"
              error={addressErrors.city?.message}
              {...registerAddress('city')}
            />
            <Input
              id="state"
              label="State"
              placeholder="Karnataka"
              error={addressErrors.state?.message}
              {...registerAddress('state')}
            />
            <Input
              id="pincode"
              label="PIN Code"
              placeholder="560001"
              error={addressErrors.pincode?.message}
              {...registerAddress('pincode')}
            />
          </div>

          <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              {...registerAddress('isDefault')}
            />
            <span>Set as default delivery address</span>
          </label>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddressModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAddress}>
              Save Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
