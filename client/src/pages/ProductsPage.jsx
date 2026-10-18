// client/src/pages/ProductsPage.jsx
import React, { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ArrowUpDown, Check, RefreshCw, Grid } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { ProductCard } from '../components/product/ProductCard.jsx';
import { Button, Skeleton, EmptyState, Modal } from '../components/ui/index.js';

const PRICE_RANGES = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under ₹50', min: '0', max: '49' },
  { label: '₹50 to ₹150', min: '50', max: '150' },
  { label: '₹151 to ₹300', min: '151', max: '300' },
  { label: 'Above ₹300', min: '301', max: '5000' },
];

export const ProductsPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  // Calculate active filter count
  const activeFiltersCount = (slug ? 1 : 0) + (inStock ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

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

  const handlePriceRangeSelect = (min, max) => {
    setPage(1);
    const updated = new URLSearchParams(searchParams);
    if (!min && !max) {
      updated.delete('minPrice');
      updated.delete('maxPrice');
    } else {
      updated.set('minPrice', min);
      updated.set('maxPrice', max);
    }
    setSearchParams(updated);
  };

  const handleCategorySelect = (catSlug) => {
    setPage(1);
    const queryStr = searchParams.toString();
    const targetUrl = catSlug
      ? `/categories/${catSlug}${queryStr ? `?${queryStr}` : ''}`
      : `/products${queryStr ? `?${queryStr}` : ''}`;
    navigate(targetUrl);
  };

  const handleResetFilters = () => {
    setPage(1);
    setSearchParams({});
    if (slug) {
      navigate('/products');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Category Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
              Home
            </Link>
            <span>/</span>
            <Link to="/categories" className="hover:text-brand-600 dark:hover:text-brand-400">
              Categories
            </Link>
            {currentCategory && (
              <>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200">{currentCategory.name}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span className="text-3xl">{currentCategory?.icon || '🛒'}</span>
            <span>{currentCategory ? currentCategory.name : 'All Groceries & Essentials'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Showing {products.length} of {totalCount} items • Guaranteed 10-minute dark store
            delivery
          </p>
        </div>

        {/* Desktop Sort Dropdown & Categories Hub Link */}
        <div className="hidden sm:flex items-center gap-3 self-start md:self-auto">
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
          >
            <Grid className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>All Categories</span>
          </Link>

          <div className="flex items-center gap-2">
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
      </div>

      {/* 2. Horizontal Category Pills Bar */}
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

      {/* 3. Mobile Filter & Sort Toolbar (< lg screens) */}
      <div className="lg:hidden flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        {/* Mobile Filters Trigger Button */}
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeFiltersCount > 0
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-brand-700 text-[10px] font-black flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Quick In-Stock Toggle for Mobile */}
        <button
          type="button"
          onClick={handleInStockToggle}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
            inStock
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          In Stock
        </button>

        {/* Mobile Sort Dropdown */}
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          aria-label="Sort products by"
          className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="popular">Popular</option>
          <option value="price_asc">Price: Low-High</option>
          <option value="price_desc">Price: High-Low</option>
          <option value="rating">Top Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* 4. Main Content: Desktop Sidebar Filter + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar (hidden on mobile, sticky on desktop) */}
        <aside className="hidden lg:block lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 space-y-6 shadow-xs sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              Filter Products
            </span>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset All
              </button>
            )}
          </div>

          {/* Category Filter in Sidebar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Categories
              </span>
              <Link
                to="/categories"
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                  !slug
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>🛒 All Products</span>
                {!slug && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
              </button>
              {categories.map((cat) => {
                const isSelected = slug === cat.slug;
                return (
                  <button
                    key={cat._id || cat.slug}
                    type="button"
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {cat.icon || '🛍️'} {cat.name}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In-Stock Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Price Range
            </span>
            {PRICE_RANGES.map((rng) => {
              const isSelected = minPrice === rng.min && maxPrice === rng.max;
              return (
                <button
                  key={rng.label}
                  type="button"
                  onClick={() => handlePriceRangeSelect(rng.min, rng.max)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center space-y-5">
              <EmptyState
                title="No products match your filters"
                description="Try loosening your price bounds, changing your category, or clearing active filters."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />

              {/* Quick Category Suggestions */}
              {categories.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    Or browse popular grocery categories:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {categories.slice(0, 5).map((cat) => (
                      <Link
                        key={cat._id || cat.slug}
                        to={`/categories/${cat.slug}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>{cat.icon || '🛍️'}</span>
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                    <Link
                      to="/categories"
                      className="px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-400 text-xs font-bold hover:underline"
                    >
                      All Categories →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
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

      {/* 5. Mobile Filter Modal */}
      <Modal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter & Refine Products"
        description="Filter by category, price range, and stock availability"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          {/* Categories Filter in Mobile Modal */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
              Category
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  !slug
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🛒 All Categories</span>
                {!slug && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
              </button>
              {categories.map((cat) => {
                const isSelected = slug === cat.slug;
                return (
                  <button
                    key={cat._id || cat.slug}
                    type="button"
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>
                      {cat.icon || '🛍️'} {cat.name}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <span>In-stock items only</span>
              <input
                type="checkbox"
                checked={inStock}
                onChange={handleInStockToggle}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          {/* Price Range Selector */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-2">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_RANGES.map((rng) => {
                const isSelected = minPrice === rng.min && maxPrice === rng.max;
                return (
                  <button
                    key={rng.label}
                    type="button"
                    onClick={() => handlePriceRangeSelect(rng.min, rng.max)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {rng.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <Button variant="outline" size="md" className="flex-1" onClick={handleResetFilters}>
              Reset All
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Show {totalCount} Items
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
