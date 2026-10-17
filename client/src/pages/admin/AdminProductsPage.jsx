// client/src/pages/admin/AdminProductsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import { resolveImageUrl, isLocalDiskPath } from '../../utils/imageUrl.js';
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

export const AdminProductsPage = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';
  const isAvailableFilter = searchParams.get('isAvailable') || '';

  const [searchInput, setSearchInput] = useState(search);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [newStockValue, setNewStockValue] = useState('');
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [stockMode, setStockMode] = useState('set'); // 'set' | 'adjust'

  // Form state
  const initialFormState = {
    name: '',
    categoryId: '',
    brand: 'Zippy Fresh',
    description: '',
    images: [{ url: '', alt: '', isPrimary: true }],
    variants: [{ sku: '', unit: '', price: '', mrp: '', stock: '' }],
    tags: '',
    isAvailable: true,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 1. Fetch categories for filter and form dropdowns
  const { data: categoriesData } = useQuery({
    queryKey: ['adminCategoriesList'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/admin/categories');
      return res?.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesData || [];

  // 2. Fetch products with pagination & filters
  const {
    data: productsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['adminProducts', { page, search, categoryFilter, isAvailableFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (isAvailableFilter !== '') params.set('isAvailable', isAvailableFilter);

      const res = await apiFetch(`/api/v1/admin/products?${params.toString()}`);
      return res;
    },
    keepPreviousData: true,
  });

  const products = productsData?.data?.products || [];
  const pagination = productsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Handle Search Submit
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

  // Handle Category Filter Change
  const handleCategoryChange = (val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('category', val);
    } else {
      newParams.delete('category');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Handle Availability Filter Change
  const handleAvailabilityChange = (val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val !== '') {
      newParams.set('isAvailable', val);
    } else {
      newParams.delete('isAvailable');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Change page
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  // Upload image to backend
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local blob preview
    const localBlob = URL.createObjectURL(file);
    setFormData((prev) => {
      const imgs = [...prev.images];
      if (!imgs[0] || !imgs[0].url) {
        imgs[0] = { url: localBlob, alt: prev.name || '', isPrimary: true };
      } else {
        imgs.push({ url: localBlob, alt: prev.name || '', isPrimary: false });
      }
      return { ...prev, images: imgs };
    });

    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      setIsUploadingImage(true);
      const res = await apiFetch('/api/v1/admin/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (res?.data?.url) {
        const uploadedUrl = res.data.url;
        setFormData((prev) => {
          const imgs = [...prev.images];
          // Replace the localBlob preview with the uploaded URL
          const targetIdx = imgs.findIndex((img) => img.url === localBlob);
          if (targetIdx !== -1) {
            imgs[targetIdx] = { ...imgs[targetIdx], url: uploadedUrl };
          } else if (!imgs[0] || !imgs[0].url) {
            imgs[0] = { url: uploadedUrl, alt: prev.name || '', isPrimary: true };
          } else {
            imgs.push({ url: uploadedUrl, alt: prev.name || '', isPrimary: false });
          }
          return { ...prev, images: imgs };
        });
        addToast({
          type: 'success',
          title: 'Image uploaded',
          message: 'Image processed and added to product.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: err.message || 'Could not upload image.',
      });
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      ...initialFormState,
      categoryId: categories[0]?._id || '',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      categoryId: prod.categoryId?._id || prod.categoryId || '',
      brand: prod.brand || 'Zippy Fresh',
      description: prod.description || '',
      images: prod.images?.length
        ? prod.images.map((img) => ({
            url: img.url,
            alt: img.alt || '',
            isPrimary: !!img.isPrimary,
          }))
        : [{ url: '', alt: '', isPrimary: true }],
      variants: prod.variants?.length
        ? prod.variants.map((v) => ({
            sku: v.sku,
            unit: v.unit,
            price: v.price.toString(),
            mrp: v.mrp.toString(),
            stock: v.stock.toString(),
          }))
        : [{ sku: '', unit: '', price: '', mrp: '', stock: '' }],
      tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
      isAvailable: prod.isAvailable !== false,
    });
    setIsFormModalOpen(true);
  };

  // Mutation: Save Product (Create or Update)
  const saveProductMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingProduct) {
        return apiFetch(`/api/v1/admin/products/${editingProduct._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiFetch('/api/v1/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      addToast({
        type: 'success',
        title: editingProduct ? 'Product updated' : 'Product created',
        message: `Successfully saved ${formData.name}`,
      });
      setIsFormModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: err.message || 'Unable to save product details.',
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
        message: 'Product name is required.',
      });
      return;
    }
    if (!formData.categoryId) {
      addToast({ type: 'warning', title: 'Validation error', message: 'Category is required.' });
      return;
    }
    if (!formData.description.trim()) {
      addToast({ type: 'warning', title: 'Validation error', message: 'Description is required.' });
      return;
    }

    const validImages = formData.images.filter((img) => img.url.trim());
    if (validImages.length === 0) {
      addToast({
        type: 'warning',
        title: 'Validation error',
        message: 'At least one image URL is required.',
      });
      return;
    }

    const formattedVariants = formData.variants.map((v) => ({
      sku: v.sku.trim().toUpperCase(),
      unit: v.unit.trim(),
      price: parseFloat(v.price) || 0,
      mrp: parseFloat(v.mrp) || parseFloat(v.price) || 0,
      stock: parseInt(v.stock, 10) || 0,
    }));

    if (formattedVariants.some((v) => !v.sku || !v.unit || v.price < 0)) {
      addToast({
        type: 'warning',
        title: 'Variant error',
        message: 'All variants must have a valid SKU, Unit, and non-negative price.',
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      brand: formData.brand.trim() || 'Zippy Fresh',
      description: formData.description.trim(),
      images: validImages,
      variants: formattedVariants,
      tags: formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      isAvailable: formData.isAvailable,
    };

    saveProductMutation.mutate(payload);
  };

  // Mutation: Toggle Availability / Soft-Delete
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (id) => {
      return apiFetch(`/api/v1/admin/products/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      addToast({
        type: 'info',
        title: 'Status updated',
        message: res.message || 'Product availability updated.',
      });
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: err.message || 'Unable to toggle product availability.',
      });
    },
  });

  // Open Quick Stock Modal
  const handleOpenStockModal = (prod) => {
    setStockProduct(prod);
    const firstVariant = prod.variants?.[0];
    setSelectedSku(firstVariant?.sku || '');
    setNewStockValue(firstVariant?.stock?.toString() || '0');
    setStockAdjustment('10');
    setStockMode('set');
    setIsStockModalOpen(true);
  };

  // Mutation: Update Stock
  const updateStockMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        sku: selectedSku,
      };
      if (stockMode === 'set') {
        payload.stock = parseInt(newStockValue, 10);
      } else {
        payload.adjustment = parseInt(stockAdjustment, 10);
      }

      return apiFetch(`/api/v1/admin/products/${stockProduct._id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
      addToast({
        type: 'success',
        title: 'Stock Updated',
        message: `Inventory updated for SKU ${selectedSku} (${res?.data?.stock ?? 'new'} units).`,
      });
      setIsStockModalOpen(false);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Stock update failed',
        message: err.message || 'Failed to update inventory level.',
      });
    },
  });

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Product Catalog & Inventory
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage multi-variant items, pricing, dark store stock levels, and real-time
            availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['adminProducts'] })}
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
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 shadow-xs">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
        >
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by product name, brand, SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.icon || '📦'} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={isAvailableFilter}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Availability</option>
              <option value="true">Available Only</option>
              <option value="false">Unavailable / Archived</option>
            </select>
          </div>
        </form>
      </Card>

      {/* Product Listing Table */}
      <Card className="overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Package}
              title="No products found"
              description="No catalog items match your search criteria or filters."
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
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Variants & Inventory</th>
                  <th className="px-5 py-3.5">Total Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {products.map((prod) => {
                  const primaryImg =
                    prod.images?.find((img) => img.isPrimary)?.url ||
                    prod.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80';

                  return (
                    <tr
                      key={prod._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImageUrl(primaryImg)}
                            alt={prod.name}
                            className="w-11 h-11 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                              Brand:{' '}
                              <strong className="text-slate-600 dark:text-slate-300 font-bold">
                                {prod.brand}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-transparent dark:border-slate-700">
                          <span>{prod.categoryId?.icon || '📦'}</span>
                          <span>{prod.categoryId?.name || prod.categorySlug || 'Category'}</span>
                        </span>
                      </td>

                      {/* Variants Summary */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {prod.variants?.map((v) => (
                            <span
                              key={v.sku}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono ${
                                v.stock <= 5
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : v.stock <= 15
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                              }`}
                              title={`SKU: ${v.sku} | MRP: ₹${v.mrp}`}
                            >
                              <span className="font-bold">{v.unit}:</span>
                              <span>₹{v.price}</span>
                              <span className="text-slate-400 dark:text-slate-500">|</span>
                              <span className="font-bold">{v.stock} pcs</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Stock */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            (prod.totalStock ?? 0) === 0
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : (prod.totalStock ?? 0) <= 15
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {prod.totalStock ?? 0} in stock
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={prod.isAvailable ? 'success' : 'neutral'}
                          size="sm"
                          icon={
                            prod.isAvailable ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-slate-400" />
                            )
                          }
                        >
                          {prod.isAvailable ? 'Active' : 'Archived'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStockModal(prod)}
                            className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                            title="Update Stock Levels"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Stock</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Toggle availability for "${prod.name}"?`)) {
                                toggleAvailabilityMutation.mutate(prod._id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1 ${
                              prod.isAvailable
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={prod.isAvailable ? 'Deactivate Product' : 'Re-activate Product'}
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

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div>
              Showing page{' '}
              <strong className="font-bold text-slate-900 dark:text-white">
                {pagination.page}
              </strong>{' '}
              of{' '}
              <strong className="font-bold text-slate-900 dark:text-white">
                {pagination.totalPages}
              </strong>{' '}
              ({pagination.total} items)
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
          CREATE / EDIT PRODUCT MODAL
         ====================================================================== */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? 'Edit Catalog Product' : 'Create New Product'}
        description="Configure product metadata, category, pricing, and variant inventory."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5 p-6 max-h-[80vh] overflow-y-auto">
          {/* General Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              General Information
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amul Taaza Fresh Toned Milk"
                className="text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.icon || '📦'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name</label>
                <Input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Amul"
                  className="text-xs h-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed nutritional info, storage instructions, and quality details..."
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          {/* Media / Images */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Media & Photography
              </h3>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-brand-600" />
                <span>{isUploadingImage ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploadingImage}
                />
              </label>
            </div>

            {formData.images.map((img, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="https://... or click Upload Image"
                    value={img.url}
                    onChange={(e) => {
                      const next = [...formData.images];
                      next[idx].url = e.target.value;
                      setFormData({ ...formData, images: next });
                    }}
                    className="text-xs h-9 flex-1"
                  />
                  {img.url && resolveImageUrl(img.url) && (
                    <img
                      src={resolveImageUrl(img.url)}
                      alt="Preview"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = formData.images.filter((_, i) => i !== idx);
                        setFormData({ ...formData, images: next });
                      }}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isLocalDiskPath(img.url) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Local file path detected. Click <strong>Upload Image</strong> above so your
                    browser can upload it.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Variants & Pricing */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Variants & Pricing
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    variants: [
                      ...formData.variants,
                      { sku: '', unit: '', price: '', mrp: '', stock: '' },
                    ],
                  });
                }}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Variant
              </button>
            </div>

            <div className="space-y-2.5">
              {formData.variants.map((variant, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-6 gap-2 items-center"
                >
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="MILK-500ML"
                      value={variant.sku}
                      onChange={(e) => {
                        const next = [...formData.variants];
                        next[idx].sku = e.target.value.toUpperCase();
                        setFormData({ ...formData, variants: next });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs uppercase font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="500 ml"
                      value={variant.unit}
                      onChange={(e) => {
                        const next = [...formData.variants];
                        next[idx].unit = e.target.value;
                        setFormData({ ...formData, variants: next });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-medium"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="28"
                      value={variant.price}
                      onChange={(e) => {
                        const next = [...formData.variants];
                        next[idx].price = e.target.value;
                        setFormData({ ...formData, variants: next });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="30"
                      value={variant.mrp}
                      onChange={(e) => {
                        const next = [...formData.variants];
                        next[idx].mrp = e.target.value;
                        setFormData({ ...formData, variants: next });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs text-slate-500"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 block">
                      Stock (Qty)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="50"
                      value={variant.stock}
                      onChange={(e) => {
                        const next = [...formData.variants];
                        next[idx].stock = e.target.value;
                        setFormData({ ...formData, variants: next });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded text-xs font-bold"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    {formData.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = formData.variants.filter((_, i) => i !== idx);
                          setFormData({ ...formData, variants: next });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 mt-3"
                        title="Remove Variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tags (Comma-separated)
              </label>
              <Input
                type="text"
                placeholder="dairy, fresh, milk, breakfast essentials"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isAvailableCheck"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <label
                htmlFor="isAvailableCheck"
                className="text-xs font-bold text-slate-800 cursor-pointer"
              >
                Available for dark store ordering immediately
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveProductMutation.isLoading}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          UPDATE STOCK MODAL
         ====================================================================== */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Update Variant Inventory"
        description={stockProduct ? `Adjust physical stock for "${stockProduct.name}"` : ''}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 p-6">
          {/* Variant Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Variant SKU
            </label>
            <select
              value={selectedSku}
              onChange={(e) => {
                const sku = e.target.value;
                setSelectedSku(sku);
                const variant = stockProduct?.variants?.find((v) => v.sku === sku);
                if (variant) {
                  setNewStockValue(variant.stock.toString());
                }
              }}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {stockProduct?.variants?.map((v) => (
                <option key={v.sku} value={v.sku}>
                  {v.sku} — {v.unit} (Current: {v.stock} pcs)
                </option>
              ))}
            </select>
          </div>

          {/* Mode Switch: Set Absolute vs Relative Adjust */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStockMode('set')}
              className={`py-1.5 rounded-lg transition-colors ${
                stockMode === 'set' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Set Absolute Stock
            </button>
            <button
              type="button"
              onClick={() => setStockMode('adjust')}
              className={`py-1.5 rounded-lg transition-colors ${
                stockMode === 'adjust' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Adjust (+ / -)
            </button>
          </div>

          {stockMode === 'set' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Absolute Stock Count
              </label>
              <Input
                type="number"
                min="0"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder="e.g. 50"
                className="text-xs h-10 font-bold"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stock Adjustment Quantity (e.g. +20 or -5)
              </label>
              <Input
                type="number"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(e.target.value)}
                placeholder="e.g. 10 or -5"
                className="text-xs h-10 font-bold"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={updateStockMutation.isLoading}
              onClick={() => updateStockMutation.mutate()}
            >
              Confirm Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProductsPage;
