// client/src/pages/admin/AdminCustomersPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  ShieldCheck,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
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

export const AdminCustomersPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const isBlockedFilter = searchParams.get('isBlocked') || '';

  const [searchInput, setSearchInput] = useState(search);

  // Modals state
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [customerToToggle, setCustomerToToggle] = useState(null);
  const [blockReason, setBlockReason] = useState('Terms of service violation');

  // 1. Fetch Customers
  const {
    data: customersData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['adminCustomers', { page, search, isBlockedFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (isBlockedFilter !== '') params.set('isBlocked', isBlockedFilter);

      const res = await apiFetch(`/api/v1/admin/customers?${params.toString()}`);
      return res;
    },
    keepPreviousData: true,
  });

  const customers = customersData?.data?.customers || [];
  const pagination = customersData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // 2. Fetch Single Customer Details
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['adminCustomerDetail', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      const res = await apiFetch(`/api/v1/admin/customers/${selectedCustomerId}`);
      return res?.data?.customer;
    },
    enabled: !!selectedCustomerId && isDetailModalOpen,
  });

  // Handle Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Handle Block Filter
  const handleBlockFilterChange = (val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val !== '') {
      newParams.set('isBlocked', val);
    } else {
      newParams.delete('isBlocked');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Page change
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  // Open Details Modal
  const handleOpenDetailModal = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsDetailModalOpen(true);
  };

  // Open Block / Unblock Modal
  const handleOpenBlockModal = (customer) => {
    setCustomerToToggle(customer);
    setBlockReason(
      customer.isBlocked ? 'Account reinstated by administrator' : 'Terms of service violation'
    );
    setIsBlockModalOpen(true);
  };

  // Mutation: Toggle Customer Block Status
  const toggleBlockMutation = useMutation({
    mutationFn: async () => {
      const willBeBlocked = !customerToToggle.isBlocked;
      return apiFetch(`/api/v1/admin/customers/${customerToToggle.id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({
          isBlocked: willBeBlocked,
          reason: blockReason.trim(),
        }),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['adminCustomerDetail', customerToToggle?.id] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      addToast({
        type: 'info',
        title: 'Account status updated',
        message: res?.message || 'Customer account updated.',
      });
      setIsBlockModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: err.message || 'Unable to update customer block status.',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory & Access
          </h1>
          <p className="text-sm font-medium text-slate-500">
            View customer order histories, manage account statuses, and enforce security account
            lockouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['adminCustomers'] })}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 shadow-xs">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
        >
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by customer name, email address, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={isBlockedFilter}
              onChange={(e) => handleBlockFilterChange(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Account Statuses</option>
              <option value="false">Active Customers Only</option>
              <option value="true">Blocked Customers Only</option>
            </select>
          </div>
        </form>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title="No customers found"
              description="No registered customers matched your search query."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchInput('');
                setSearchParams({});
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Email Status</th>
                  <th className="px-5 py-3.5">Total Orders</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900">{cust.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Joined{' '}
                        {new Date(cust.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <div className="text-slate-800 font-medium">{cust.email}</div>
                      <div className="text-[11px] text-slate-400">
                        {cust.phone || 'No phone recorded'}
                      </div>
                    </td>

                    {/* Email Verified */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {cust.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          Unverified
                        </span>
                      )}
                    </td>

                    {/* Total Orders */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900">
                      {cust._count?.orders ?? 0} orders
                    </td>

                    {/* Account Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={cust.isBlocked ? 'danger' : 'success'}
                        size="sm"
                        icon={
                          cust.isBlocked ? (
                            <Ban className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          )
                        }
                      >
                        {cust.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(cust.id)}
                          className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                          title="View Customer Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenBlockModal(cust)}
                          className={`p-1.5 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 ${
                            cust.isBlocked
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          title={cust.isBlocked ? 'Unblock Customer' : 'Block Customer Account'}
                        >
                          {cust.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <strong className="font-bold text-slate-900">{pagination.page}</strong>{' '}
              of <strong className="font-bold text-slate-900">{pagination.totalPages}</strong> (
              {pagination.total} customers)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ======================================================================
          CUSTOMER PROFILE DETAILS MODAL
         ====================================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailData ? detailData.name : 'Customer Profile'}
        description="Customer account details, registered addresses, and recent order history."
        maxWidth="max-w-2xl"
      >
        {isLoadingDetail || !detailData ? (
          <div className="p-6 space-y-4 animate-pulse">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5 p-6 max-h-[80vh] overflow-y-auto text-xs">
            {/* Profile Overview */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Contact Email
                </span>
                <div className="font-bold text-slate-900 mt-0.5 truncate">{detailData.email}</div>
                <div className="text-slate-500">{detailData.phone || 'No phone'}</div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Account Security
                </span>
                <div className="mt-1">
                  <Badge variant={detailData.isBlocked ? 'danger' : 'success'} size="sm">
                    {detailData.isBlocked ? 'Account Blocked' : 'Active Account'}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Registered Date
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {new Date(detailData.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Saved Delivery Addresses */}
            <div className="space-y-2">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Saved Addresses ({detailData.addresses?.length || 0})</span>
              </h3>

              {detailData.addresses?.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                  No saved addresses.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detailData.addresses?.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {addr.type}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] text-brand-600 font-bold">Default</span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        {addr.line1}, {addr.city}, {addr.state} -{' '}
                        <strong className="text-slate-900 font-bold">{addr.pincode}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="space-y-2">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                <span>Order History ({detailData.orders?.length || 0})</span>
              </h3>

              {detailData.orders?.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                  No orders placed yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Order #</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {detailData.orders?.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">
                            {ord.orderNumber}
                          </td>
                          <td className="px-4 py-2 text-slate-500">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-900">
                            ₹{Number(ord.totalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100">
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================================
          BLOCK / UNBLOCK CONFIRMATION MODAL
         ====================================================================== */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title={
          customerToToggle?.isBlocked
            ? `Re-activate Account: ${customerToToggle?.name}`
            : `Block Customer: ${customerToToggle?.name}`
        }
        description={
          customerToToggle?.isBlocked
            ? 'Allow this user to sign in and place new grocery orders again.'
            : 'Revoke active refresh tokens and immediately prevent this user from signing in or placing orders.'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-6 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {customerToToggle?.isBlocked ? 'Unblock Justification' : 'Reason for Blocking *'}
            </label>
            <textarea
              required
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Provide an internal reason for security and audit logs..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={customerToToggle?.isBlocked ? 'primary' : 'danger'}
              size="sm"
              isLoading={toggleBlockMutation.isLoading}
              onClick={() => toggleBlockMutation.mutate()}
            >
              {customerToToggle?.isBlocked ? 'Re-activate Account' : 'Confirm Account Block'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminCustomersPage;
