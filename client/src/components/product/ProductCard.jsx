// client/src/components/product/ProductCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Zap } from 'lucide-react';
import { AddToCartButton } from '../common/AddToCartButton.jsx';
import { cn } from '../../utils/cn.js';
import { resolveImageUrl } from '../../utils/imageUrl.js';

export const ProductCard = ({ product, className }) => {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  if (!product) return null;

  // Selected variant state (defaults to first variant)
  const variants = product.variants || [];

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

  // Primary image
  const primaryImg =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url ||
    product.image ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';

  return (
    <div
      data-testid={`product-card-${product.slug || product._id}`}
      className={cn(
        'group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 sm:p-3.5',
        'hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-floating transition-all duration-200 select-none',
        className
      )}
    >
      <div>
        {/* Image & Badges Container */}
        <div className="relative aspect-square w-full rounded-xl bg-slate-50 dark:bg-slate-800/80 overflow-hidden mb-2.5 flex items-center justify-center">
          <Link
            to={`/products/${product.slug}`}
            className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-xl"
            aria-label={`View details for ${product.name}`}
          >
            <img
              src={resolveImageUrl(primaryImg)}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.target.src =
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
              }}
            />
          </Link>

          {/* Discount Pill */}
          {discountPercent > 0 && (
            <span className="absolute top-2 left-2 z-10 bg-brand-600 text-white font-black text-[10px] tracking-wide px-1.5 py-0.5 rounded-md shadow-xs">
              {discountPercent}% OFF
            </span>
          )}

          {/* 10 Min Delivery Pill */}
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs text-slate-700 dark:text-slate-200 font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-xs border border-slate-100 dark:border-slate-700">
            <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
            10 MINS
          </span>
        </div>

        {/* Brand & Ratings */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-1">
          <span className="uppercase tracking-wider truncate max-w-[120px]">
            {product.brand || 'Fresh Daily'}
          </span>
          {Number(product.ratingAverage) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1 py-0.5 rounded">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {Number(product.ratingAverage).toFixed(1)}
            </span>
          )}
        </div>

        {/* Product Title */}
        <Link
          to={`/products/${product.slug}`}
          className="block font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug hover:text-brand-700 dark:hover:text-brand-400 transition-colors mb-1.5"
        >
          {product.name}
        </Link>

        {/* Variant selector dropdown or single unit pill */}
        {variants.length > 1 ? (
          <div className="mb-2">
            <select
              value={selectedVariantIndex}
              onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
              aria-label="Select product unit"
              className="w-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              {variants.map((v, idx) => (
                <option key={v.sku || idx} value={idx}>
                  {v.unit} — ₹{v.price}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            {activeVariant.unit}
          </div>
        )}
      </div>

      {/* Bottom Pricing & Add Action */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t border-slate-50 dark:border-slate-800 mt-1 min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col shrink-0 mr-1">
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ₹{price}
          </span>
          {mrp > price && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
              ₹{mrp}
            </span>
          )}
        </div>

        <AddToCartButton productId={product._id} variant={activeVariant} size="sm" />
      </div>
    </div>
  );
};

export default ProductCard;
