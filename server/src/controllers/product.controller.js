// server/src/controllers/product.controller.js
import mongoose from 'mongoose';
import { Product, Review } from '../models/index.js';
import { invalidateCatalogCache } from '../utils/cache.js';

/**
 * Get products with pagination, category filter, price range, brand, stock, and sorting.
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      inStock,
      brand,
      rating,
      sort = 'newest',
    } = req.query;

    const filter = { isAvailable: true };

    // 1. Category Filter (supports either slug or ObjectId)
    if (category) {
      if (mongoose.isValidObjectId(category)) {
        filter.categoryId = category;
      } else {
        // Resolve slug to category ID or match categorySlug directly
        filter.categorySlug = category.toLowerCase().trim();
      }
    }

    // 2. Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.primaryPrice = {};
      if (minPrice !== undefined) filter.primaryPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.primaryPrice.$lte = Number(maxPrice);
    }

    // 3. In-Stock Filter
    if (inStock === true) {
      filter.totalStock = { $gt: 0 };
    }

    // 4. Brand Filter
    if (brand) {
      filter.brand = { $regex: new RegExp(`^${brand.trim()}$`, 'i') };
    }

    // 5. Minimum Rating Filter
    if (rating !== undefined) {
      filter.ratingAverage = { $gte: Number(rating) };
    }

    // 6. Sorting Configuration
    let sortObj = { createdAt: -1 };
    switch (sort) {
      case 'price_asc':
        sortObj = { primaryPrice: 1 };
        break;
      case 'price_desc':
        sortObj = { primaryPrice: -1 };
        break;
      case 'rating':
      case 'popular':
        sortObj = { ratingAverage: -1, reviewCount: -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('categoryId', 'name slug image icon')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
    ]);

    const totalPages = Math.ceil(total / Number(limit)) || 1;

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
      data: {
        products,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get product details by slug or ObjectId with populated category and reviews.
 */
export const getProductBySlugOrId = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    const query = mongoose.isValidObjectId(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId };

    const product = await Product.findOne({ ...query, isAvailable: true })
      .populate('categoryId', 'name slug image icon')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product "${slugOrId}" not found or currently unavailable.`,
        },
      });
    }

    // Fetch product reviews
    const reviews = await Review.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        product: {
          ...product,
          reviews,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit or update rating & review for a product.
 */
export const addProductReview = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.email?.split('@')[0] || 'Customer';

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be an integer between 1 and 5.',
        },
      });
    }

    const query = mongoose.isValidObjectId(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId };

    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product "${slugOrId}" not found.`,
        },
      });
    }

    // Upsert user's review for this product
    const review = await Review.findOneAndUpdate(
      { productId: product._id, userId },
      {
        productId: product._id,
        userId,
        userName,
        rating: Math.round(Number(rating)),
        comment: comment?.trim() || '',
        isVerifiedPurchase: true,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Recalculate average rating & review count for product
    const allReviews = await Review.find({ productId: product._id }).lean();
    const count = allReviews.length;
    const avg = count > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    product.reviewCount = count;
    product.ratingAverage = Math.round(avg * 10) / 10;
    await product.save();

    // Invalidate catalog cache
    invalidateCatalogCache();

    res.status(200).json({
      success: true,
      message: 'Thank you! Your rating and review have been recorded.',
      data: {
        review,
        product: {
          ratingAverage: product.ratingAverage,
          reviewCount: product.reviewCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
