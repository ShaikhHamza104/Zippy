// client/src/pages/HomePage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Sparkles, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { ProductCard } from '../components/product/ProductCard.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export const HomePage = () => {
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['homeFeed'],
    queryFn: async () => {
      const res = await apiFetch('/api/v1/home');
      return res?.data;
    },
    staleTime: 60 * 1000,
  });

  const banners = homeData?.banners || [];
  const categories = homeData?.categories || [];
  const trendingProducts = homeData?.trendingProducts || [];
  const featuredSections = homeData?.featuredSections || [];

  return (
    <div className="space-y-10 pb-8">
      {/* 1. Hero Lightning Delivery Header & Static Promotional Banners */}
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-800 text-white p-6 sm:p-10 shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-accent-400 fill-accent-400" />
              <span>10-Minute Dark Store Delivery</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Groceries & Fresh Food delivered in{' '}
              <span className="text-accent-400 underline decoration-white/40">10 minutes</span>
            </h1>

            <p className="text-emerald-100 text-sm sm:text-base font-medium max-w-lg">
              Farm-fresh dairy, crisp vegetables, snacks, and daily household staples delivered
              straight to your kitchen counter.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-white text-brand-800 font-black px-6 py-3 rounded-2xl text-sm shadow-md hover:bg-emerald-50 transition-all focus:outline-none focus:ring-2 focus:ring-white"
              >
                <span>Shop All Essentials</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100">
                <Clock className="w-4 h-4 text-accent-400" />
                <span>Instant dispatch from nearest dark store</span>
              </div>
            </div>
          </div>

          {/* Decorative watermark icon */}
          <div className="absolute right-2 -bottom-10 opacity-10 pointer-events-none select-none">
            <Zap className="w-72 h-72" />
          </div>
        </div>

        {/* Static Promotional Banners Grid (No autoplay carousels) */}
        {banners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <div
                key={banner._id || banner.id}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-brand-600 text-white p-5 flex flex-col justify-between shadow-sm min-h-[140px]"
              >
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider bg-black/20 px-2 py-0.5 rounded-full inline-block mb-1.5">
                    Limited Deal
                  </span>
                  <h3 className="text-lg font-black leading-snug line-clamp-1">{banner.title}</h3>
                  <p className="text-xs text-amber-100 font-medium line-clamp-1">
                    {banner.subtitle || 'Best price guaranteed on daily essentials'}
                  </p>
                </div>
                {banner.linkUrl && (
                  <Link
                    to={banner.linkUrl}
                    className="inline-flex items-center gap-1 text-xs font-bold text-white hover:underline pt-2"
                  >
                    <span>Claim Offer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Shop by Category Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Shop by Category
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Explore everything your pantry needs
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"
          >
            <span>All categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat._id || cat.slug}
                to={`/categories/${cat.slug}`}
                className="group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-floating transition-all text-center flex flex-col items-center justify-center cursor-pointer select-none"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-2xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
                  {cat.icon || '🛒'}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Trending Essentials Product Rail */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Trending Essentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Most ordered items in your neighborhood
              </p>
            </div>
          </div>
          <Link
            to="/products?sort=popular"
            className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {trendingProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Featured Category Product Rails */}
      {featuredSections.map((section) => (
        <section key={section.categoryId || section.categorySlug} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{section.categoryIcon || '🛍️'}</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {section.categoryName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Fresh stock sourced directly
                </p>
              </div>
            </div>
            <Link
              to={`/categories/${section.categorySlug}`}
              className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center gap-1"
            >
              <span>See more</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {section.products?.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      ))}

      {/* 5. Quick-Commerce Guarantees */}
      <section className="bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              10-Minute Dispatch
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Automated picking inside hyper-local micro fulfillment dark stores.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Zero Spoilage Guarantee
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Temperature-controlled cold-chain for farm milk, curd, and organic veggies.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Free Delivery Over ₹199
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              No hidden surge charges or packaging fees. Simple, honest pricing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
