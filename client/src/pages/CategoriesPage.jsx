// client/src/pages/CategoriesPage.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, ArrowRight, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export const CategoriesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/categories');
      return res?.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter categories by search input
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(q) ||
        cat.slug?.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Total products across all categories
  const totalProducts = useMemo(() => {
    return categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
  }, [categories]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200">Categories</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-brand-700 dark:text-brand-300 text-[11px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>10-Minute Dark Store Delivery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Explore All Categories
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Browse through {categories.length} categories with over {totalProducts || '60+'} fresh
              groceries and household essentials
            </p>
          </div>

          {/* Quick link to all products */}
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shrink-0 self-start md:self-auto"
          >
            <ShoppingCart className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Browse All Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Category Search Input */}
        <div className="mt-6 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories (e.g. Dairy, Fruits, Snacks)..."
            aria-label="Search categories"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Failed to load categories. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No categories matching &quot;{searchQuery}&quot;
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try searching for something else or view all available categories.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredCategories.map((cat) => (
            <Link
              key={cat._id || cat.slug}
              to={`/categories/${cat.slug}`}
              className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-600 p-4 sm:p-5 shadow-xs hover:shadow-floating transition-all flex flex-col justify-between cursor-pointer select-none relative overflow-hidden"
            >
              {/* Top Accent Icon & Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-slate-800 dark:to-slate-700/60 flex items-center justify-center text-3xl sm:text-4xl shadow-xs transition-transform duration-200 group-hover:scale-105">
                  {cat.icon || '🛒'}
                </div>
                {cat.productCount !== undefined && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] font-extrabold tracking-wide">
                    {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {/* Title and Description */}
              <div className="mt-4 space-y-1">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                  {cat.name}
                </h2>
                {cat.description ? (
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                    {cat.description}
                  </p>
                ) : (
                  <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Fresh & handpicked daily
                  </p>
                )}
              </div>

              {/* View Action Pill */}
              <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-brand-700 dark:text-brand-400 group-hover:text-brand-800 dark:group-hover:text-brand-300">
                <span>View Products</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
