// client/src/pages/ProductDetailPage.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Zap, Share2, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../services/api.js';
import { AddToCartButton } from '../components/common/AddToCartButton.jsx';
import { Button, Skeleton } from '../components/ui/index.js';
import { useUIStore } from '../stores/uiStore.js';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const { deliveryPincode, togglePincodeModal, addToast } = useUIStore();

  const {
    data: productData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/products/${slug}`);
      return res?.data?.product;
    },
    staleTime: 60 * 1000,
  });

  const product = productData;
  const variants = product?.variants || [];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4 rounded" />
            <Skeleton className="h-6 w-1/3 rounded" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">
          The requested grocery item may be out of stock or no longer available.
        </p>
        <Link to="/products">
          <Button variant="primary">Browse All Products</Button>
        </Link>
      </div>
    );
  }

  const activeVariant = variants[selectedVariantIndex] || {
    sku: product.primarySku || 'sku_default',
    unit: product.unit || '1 unit',
    price: product.primaryPrice || 0,
    mrp: product.primaryMrp || product.primaryPrice || 0,
    stock: product.totalStock ?? 10,
  };

  const price = Number(activeVariant.price || 0);
  const mrp = Number(activeVariant.mrp || price);
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const images = product.images?.length
    ? product.images.map((img) => img.url)
    : [
        product.image ||
          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Order ${product.name} on Zippy in 10 minutes!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast({
        type: 'info',
        title: 'Link copied',
        message: 'Product link copied to your clipboard',
      });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <span>/</span>
          {product.categoryId?.slug ? (
            <Link
              to={`/categories/${product.categoryId.slug}`}
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              {product.categoryId.name}
            </Link>
          ) : (
            <Link to="/products" className="hover:text-brand-600 dark:hover:text-brand-400">
              Products
            </Link>
          )}
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
            {product.name}
          </span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share product"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs font-bold"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Main Grid: Gallery + Variant & Purchase Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-center shadow-xs overflow-hidden">
            <img
              src={images[selectedImageIndex] || images[0]}
              alt={product.name}
              className="w-full h-full object-contain max-h-[380px]"
            />

            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 z-10 bg-brand-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl border p-1 bg-white dark:bg-slate-800 overflow-hidden transition-all ${
                    selectedImageIndex === idx
                      ? 'border-brand-600 ring-2 ring-brand-500/30'
                      : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info, Variant Selector & Cart CTA */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-md">
              {product.brand || 'Zippy Supermarket'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2 leading-tight">
              {product.name}
            </h1>

            {/* Rating pill */}
            <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {Number(product.ratingAverage) > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {Number(product.ratingAverage).toFixed(1)} ({product.reviewCount || 0} reviews)
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Newly launched</span>
              )}
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                In stock at dark store
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  ₹{price}
                </span>
                {mrp > price && (
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 line-through">
                    ₹{mrp}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Inclusive of all applicable taxes
              </p>
            </div>

            <AddToCartButton productId={product._id} variant={activeVariant} size="lg" />
          </div>

          {/* Multi-Variant Selector Pills */}
          {variants.length > 1 && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Pack Size / Unit:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {variants.map((v, idx) => {
                  const isSelected = selectedVariantIndex === idx;
                  const vPrice = Number(v.price || 0);
                  const vMrp = Number(v.mrp || vPrice);
                  const vDiscount = vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;
                  return (
                    <button
                      key={v.sku || idx}
                      type="button"
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-brand-600 bg-emerald-50/60 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {vDiscount > 0 && (
                        <span className="absolute top-2 right-2 text-[9px] font-black bg-brand-600 text-white px-1.5 py-0.5 rounded">
                          {vDiscount}% OFF
                        </span>
                      )}
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.unit}
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                        ₹{vPrice}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10-Minute Delivery Promise & Location Pill */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  Delivering in 10 mins to {deliveryPincode}
                </h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Packed immediately by trained dark store staff.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => togglePincodeModal(true)}
              className="text-xs font-bold text-brand-700 dark:text-brand-400 hover:underline shrink-0"
            >
              Change
            </button>
          </div>

          {/* Product Highlights & Shelf Life */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Product Highlights
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {product.description ||
                'Guaranteed fresh daily essential delivered directly from certified suppliers through temperature-monitored dark store storage.'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-400 block font-medium text-[11px]">
                  Shelf Life
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {product.shelfLife || 'Fresh 3-5 days'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 dark:text-slate-400 block font-medium text-[11px]">
                  Country of Origin
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {product.countryOfOrigin || 'India'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Customer Ratings & Reviews
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verified buyer feedback from instant orders
            </p>
          </div>
          {Number(product.ratingAverage) > 0 && (
            <div className="flex items-center gap-1.5 text-base font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-xl">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              <span>{Number(product.ratingAverage).toFixed(1)} / 5</span>
            </div>
          )}
        </div>

        {product.reviews?.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {product.reviews.map((rev) => (
              <div key={rev._id || rev.id} className="py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {rev.userName || 'Verified Buyer'}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rev.comment}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
            No customer reviews yet. Be the first to try this fresh item!
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetailPage;
