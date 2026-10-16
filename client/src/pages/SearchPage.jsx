// client/src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { ProductCard } from '../components/product/ProductCard.jsx';
import { Skeleton, EmptyState } from '../components/ui/index.js';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const [page, setPage] = useState(1);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', query, sort, page],
    queryFn: async () => {
      if (!query.trim()) return null;
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '16');

      const res = await apiFetch(`/api/v1/search?${params.toString()}`);
      return res;
    },
    enabled: Boolean(query.trim()),
    staleTime: 30 * 1000,
  });

  const products = searchData?.data?.products || [];
  const total = searchData?.pagination?.total ?? products.length;

  const handleSortChange = (newSort) => {
    setPage(1);
    const updated = new URLSearchParams(searchParams);
    updated.set('sort', newSort);
    setSearchParams(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-slate-400">
            <Link to="/" className="hover:text-brand-600">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-800">Search Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Search for &ldquo;{query}&rdquo;
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {total} {total === 1 ? 'item found' : 'items found'} • Delivered to you in 10 minutes
          </p>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sort search results by"
            className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="relevance">Best Match</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newly Added</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <EmptyState
            title={`No results found for "${query}"`}
            description="We couldn't find matches for this keyword. Try checking for typos or searching for categories like dairy, fruits, or snacks."
            actionLabel="Explore All Products"
            onAction={() => (window.location.href = '/products')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
