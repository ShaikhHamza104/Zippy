// client/src/pages/admin/AdminBannersPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image,
  Plus,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
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

export const AdminBannersPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const initialFormState = {
    title: '',
    imageUrl: '',
    linkUrl: '/categories',
    badgeText: 'SUPER SAVINGS',
    displayOrder: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Fetch Banners
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['adminBanners'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/banners');
      return res?.data?.banners || [];
    },
  });

  const banners = data || [];

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingBanner(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '/categories',
      badgeText: banner.badgeText || 'SUPER SAVINGS',
      displayOrder: banner.displayOrder ?? 0,
      isActive: banner.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Upload file for banner
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      setIsUploadingImage(true);
      const res = await apiFetch('/api/v1/admin/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (res?.data?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.url }));
        addToast({
          type: 'success',
          title: 'Banner uploaded',
          message: 'Banner image saved and processed.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: err.message || 'Could not upload banner image.',
      });
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Mutation: Save Banner (Create or Update)
  const saveBannerMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingBanner) {
        return apiFetch(`/api/v1/admin/banners/${editingBanner._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiFetch('/api/v1/admin/banners', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
      addToast({
        type: 'success',
        title: editingBanner ? 'Banner updated' : 'Banner created',
        message: `Saved promotional banner "${formData.title}"`,
      });
      setIsModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'Unable to save banner.',
      });
    },
  });

  // Handle Form Submit
  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'Banner title is required.',
      });
      return;
    }
    if (!formData.imageUrl.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'Banner image URL is required.',
      });
      return;
    }

    const payload = {
      title: formData.title.trim(),
      imageUrl: formData.imageUrl.trim(),
      linkUrl: formData.linkUrl.trim() || '/categories',
      badgeText: formData.badgeText.trim() || 'SUPER SAVINGS',
      displayOrder: parseInt(formData.displayOrder, 10) || 0,
      isActive: formData.isActive,
    };

    saveBannerMutation.mutate(payload);
  };

  // Mutation: Delete Banner
  const deleteBannerMutation = useMutation({
    mutationFn: async (id) => {
      return apiFetch(`/api/v1/admin/banners/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
      addToast({
        type: 'info',
        title: 'Banner deleted',
        message: res?.message || 'Banner removed successfully.',
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: err.message || 'Unable to delete banner.',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Storefront Banners & Campaigns
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Publish static campaign creatives, deal headers, and category deep-link promotional
            graphics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminBanners'] })}
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
            Create Banner
          </Button>
        </div>
      </div>

      {/* Banners Grid / Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Image}
              title="No promotional banners"
              description="Upload high-converting promotional banners for the storefront homepage."
              actionLabel="Add Banner"
              onAction={handleOpenCreateModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="px-5 py-3.5">Banner Creative</th>
                  <th className="px-5 py-3.5">Campaign Title</th>
                  <th className="px-5 py-3.5">Badge Text</th>
                  <th className="px-5 py-3.5">Target Link</th>
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {banners.map((banner) => (
                  <tr
                    key={banner._id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
                  >
                    {/* Creative Thumbnail */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="w-24 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        onError={(e) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    </td>

                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {banner.title}
                      </div>
                    </td>

                    {/* Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {banner.badgeText || 'PROMO'}
                      </span>
                    </td>

                    {/* Target Link */}
                    <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span>{banner.linkUrl}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </span>
                    </td>

                    {/* Order */}
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      #{banner.displayOrder ?? 0}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={banner.isActive ? 'success' : 'neutral'}
                        size="sm"
                        icon={
                          banner.isActive ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          )
                        }
                      >
                        {banner.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(banner)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                          title="Edit Banner"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete banner "${banner.title}"?`)) {
                              deleteBannerMutation.mutate(banner._id);
                            }
                          }}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ======================================================================
          CREATE / EDIT BANNER MODAL
         ====================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'Create Banner Creative'}
        description="Configure banner headline, target destination, and visual asset."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 p-6 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Banner Title *
            </label>
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. 50% Off Morning Breakfast Staples"
              className="text-xs h-10"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Image Asset URL *
              </label>
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-emerald-400 hover:text-brand-700 dark:hover:text-emerald-300 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingImage}
                />
              </label>
            </div>
            <Input
              type="url"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://... 16:9 banner creative"
              className="text-xs h-10"
            />
            {formData.imageUrl && (
              <div className="mt-2">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-28 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Badge Text
              </label>
              <Input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                placeholder="SUPER SAVINGS"
                className="text-xs h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Link URL
              </label>
              <Input
                type="text"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="/categories/dairy"
                className="text-xs h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Display Order
              </label>
              <Input
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                className="text-xs h-10 font-bold"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="bannerActiveCheck"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-brand-500"
              />
              <label
                htmlFor="bannerActiveCheck"
                className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Publish on Storefront
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveBannerMutation.isLoading}
            >
              {editingBanner ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminBannersPage;
