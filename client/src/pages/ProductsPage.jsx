// client/src/pages/ProductsPage.jsx
import React, { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ArrowUpDown, Check, RefreshCw } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { ProductCard } from '../components/product/ProductCard.jsx';
import { Button, Skeleton, EmptyState } from '../components/ui/index.js';

export const ProductsPage = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active filter states
  const sort = searchParams.get('sort') || 'popular';
  const inStock = searchParams.get('inStock') === 'true';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const [page, setPage] = useState(1);

  // Fetch categories for pills / sidebar
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/categories');
      return res?.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData || [];
  const currentCategory = slug ? categories.find((c) => c.slug === slug) : null;

  // Fetch products
  const {
    data: productsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['products', slug, sort, inStock, minPrice, maxPrice, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (slug) params.set('category', slug);
      if (sort) params.set('sort', sort);
      if (inStock) params.set('inStock', 'true');
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', String(page));
      params.set('limit', '16');

      const res = await apiFetch(`/api/v1/products?${params.toString()}`);
      return res;
    },
    staleTime: 30 * 1000,
  });

  const products = productsData?.data?.products || [];
  const pagination = productsData?.pagination || {};
  const totalCount = pagination.total ?? products.length;

  const handleSortChange = (newSort) => {
    setPage(1);
    const updated = new URLSearchParams(searchParams);
    updated.set('sort', newSort);
    setSearchParams(updated);
  };

  const handleInStockToggle = () => {
    setPage(1);
    const updated = new URLSearchParams(searchParams);
    if (inStock) {
      updated.delete('inStock');
    } else {
      updated.set('inStock', 'true');
    }
    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Category Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
              Home
            </Link>
            <span>/</span>
            <Link to="/products" className="hover:text-brand-600 dark:hover:text-brand-400">
              Products
            </Link>
            {currentCategory && (
              <>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200">{currentCategory.name}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>{currentCategory?.icon || '🛒'}</span>
            <span>{currentCategory ? currentCategory.name : 'All Groceries & Essentials'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Showing {products.length} of {totalCount} items • Guaranteed 10-minute delivery
          </p>
        </div>

        {/* Sort Selector Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sort products by"
            className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newly Added</option>
          </select>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          to="/products"
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
            !slug
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-brand-500'
          }`}
        >
          All Items
        </Link>
        {categories.map((cat) => {
          const isActive = slug === cat.slug;
          return (
            <Link
              key={cat._id || cat.slug}
              to={`/categories/${cat.slug}`}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-brand-500'
              }`}
            >
              <span>{cat.icon || '🛍️'}</span>
              <span>{cat.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content: Sidebar Filter + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters Sidebar */}
        <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              Filters
            </span>
            {(inStock || minPrice || maxPrice) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* In-Stock Toggle */}
          <div>
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStock}
                onChange={handleInStockToggle}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
              <span>In-stock items only</span>
            </label>
          </div>

          {/* Quick Price Ranges */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Price Range
            </span>
            {[
              { label: 'Under ₹50', min: '0', max: '50' },
              { label: '₹50 to ₹150', min: '50', max: '150' },
              { label: '₹150 to ₹300', min: '150', max: '300' },
              { label: 'Above ₹300', min: '300', max: '5000' },
            ].map((rng) => {
              const isSelected = minPrice === rng.min && maxPrice === rng.max;
              return (
                <button
                  key={rng.label}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    const updated = new URLSearchParams(searchParams);
                    if (isSelected) {
                      updated.delete('minPrice');
                      updated.delete('maxPrice');
                    } else {
                      updated.set('minPrice', rng.min);
                      updated.set('maxPrice', rng.max);
                    }
                    setSearchParams(updated);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{rng.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8">
              <EmptyState
                title="No products match your filters"
                description="Try loosening your price bounds, changing the sort order, or looking at all categories."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination / Load More */}
              {pagination.totalPages > 1 && (
                <div className="pt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="md"
                    disabled={!pagination.hasPrevPage || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous Page
                  </Button>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="md"
                    disabled={!pagination.hasNextPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next Page
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
