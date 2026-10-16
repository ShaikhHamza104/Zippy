// client/src/pages/admin/AdminCategoriesPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
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

export const AdminCategoriesPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const initialFormState = {
    name: '',
    slug: '',
    icon: '📦',
    image: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  // 1. Fetch Categories
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/categories');
      return res?.data?.categories || [];
    },
  });

  const categories = data || [];

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug || '',
      icon: cat.icon || '📦',
      image: cat.image || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder ?? 0,
      isActive: cat.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Upload file for category image
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
        setFormData((prev) => ({ ...prev, image: res.data.url }));
        addToast({
          type: 'success',
          title: 'Image uploaded',
          message: 'Category image uploaded successfully.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: err.message || 'Could not upload category image.',
      });
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Mutation: Save Category (Create or Update)
  const saveCategoryMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCategory) {
        return apiFetch(`/api/v1/admin/categories/${editingCategory._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiFetch('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['adminCategoriesList'] });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
      addToast({
        type: 'success',
        title: editingCategory ? 'Category updated' : 'Category created',
        message: `Successfully saved ${formData.name}`,
      });
      setIsModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'Unable to save category.',
      });
    },
  });

  // Handle Form Submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'Category name is required.',
      });
      return;
    }
    if (!formData.image.trim()) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'Category image URL is required.',
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      icon: formData.icon.trim() || '📦',
      image: formData.image.trim(),
      description: formData.description.trim(),
      displayOrder: parseInt(formData.displayOrder, 10) || 0,
      isActive: formData.isActive,
    };

    if (formData.slug.trim()) {
      payload.slug = formData.slug.trim().toLowerCase();
    }

    saveCategoryMutation.mutate(payload);
  };

  // Mutation: Toggle / Soft-Delete Category
  const toggleCategoryMutation = useMutation({
    mutationFn: async (id) => {
      return apiFetch(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['adminCategoriesList'] });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
      addToast({
        type: 'info',
        title: 'Category updated',
        message: res?.message || 'Category status updated.',
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: err.message || 'Unable to toggle category.',
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Category Management</h1>
          <p className="text-sm font-medium text-slate-500">
            Organize catalog taxonomies, display orders, icons, and storefront banner
            representations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminCategories'] })}
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
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={FolderTree}
              title="No categories found"
              description="Create your first catalog category to start organizing grocery items."
              actionLabel="Add Category"
              onAction={handleOpenCreateModal}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Slug</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Display Order</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Category with Icon/Image */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-xl flex items-center justify-center shrink-0">
                            {cat.icon || '📦'}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="text-base">{cat.icon}</span>
                            <span>{cat.name}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-3.5 font-mono text-slate-500 font-bold">{cat.slug}</td>

                    {/* Description */}
                    <td className="px-5 py-3.5 max-w-xs truncate text-slate-500">
                      {cat.description || '—'}
                    </td>

                    {/* Display Order */}
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      #{cat.displayOrder ?? 0}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={cat.isActive ? 'success' : 'neutral'}
                        size="sm"
                        icon={
                          cat.isActive ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400" />
                          )
                        }
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Toggle status for category "${cat.name}"?`)) {
                              toggleCategoryMutation.mutate(cat._id);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 ${
                            cat.isActive
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
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
          CREATE / EDIT CATEGORY MODAL
         ====================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        description="Configure category display, iconography, and ordering."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dairy, Bread & Eggs"
              className="text-xs h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Slug (Optional)</label>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="dairy-bread-eggs"
                className="text-xs h-10 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Icon (Emoji) *</label>
              <Input
                type="text"
                required
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🥛"
                className="text-xs h-10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Image URL *</label>
              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer">
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
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://... category banner image"
              className="text-xs h-10"
            />
            {formData.image && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                />
                <span className="text-[11px] text-slate-400">Preview</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Fresh milk, artisan breads, and farm eggs..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
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
                id="catActiveCheck"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <label
                htmlFor="catActiveCheck"
                className="text-xs font-bold text-slate-800 cursor-pointer"
              >
                Visible on Storefront
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveCategoryMutation.isLoading}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCategoriesPage;
