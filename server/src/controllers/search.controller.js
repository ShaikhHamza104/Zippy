// server/src/controllers/search.controller.js
import mongoose from 'mongoose';
import { Category, Product } from '../models/index.js';

/**
 * Full-text search with MongoDB text index, weighted scores, filters, and pagination.
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20, category, minPrice, maxPrice, sort = 'relevance' } = req.query;

    const filter = {
      isAvailable: true,
      $text: { $search: q },
    };

    // Category filter
    if (category) {
      if (mongoose.isValidObjectId(category)) {
        filter.categoryId = category;
      } else {
        filter.categorySlug = category.toLowerCase().trim();
      }
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.primaryPrice = {};
      if (minPrice !== undefined) filter.primaryPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.primaryPrice.$lte = Number(maxPrice);
    }

    // Sorting configuration
    let sortObj = { score: { $meta: 'textScore' } };
    if (sort === 'price_asc') {
      sortObj = { primaryPrice: 1 };
    } else if (sort === 'price_desc') {
      sortObj = { primaryPrice: -1 };
    } else if (sort === 'rating') {
      sortObj = { ratingAverage: -1 };
    } else if (sort === 'newest') {
      sortObj = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter, { score: { $meta: 'textScore' } })
        .populate('categoryId', 'name slug image icon')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
    ]);

    const totalPages = Math.ceil(total / Number(limit)) || 1;

    res.status(200).json({
      success: true,
      query: q,
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
 * Fast search suggestions / autocomplete dropdown for debounced frontend input.
 */
export const getSuggestions = async (req, res, next) => {
  try {
    const { q, limit = 8 } = req.query;
    const cleanQuery = q.trim();

    // Regex for prefix and fuzzy boundary matching
    const searchRegex = new RegExp(cleanQuery, 'i');

    const [products, categories] = await Promise.all([
      Product.find(
        {
          isAvailable: true,
          $or: [
            { name: { $regex: searchRegex } },
            { brand: { $regex: searchRegex } },
            { tags: { $in: [searchRegex] } },
          ],
        },
        {
          name: 1,
          slug: 1,
          brand: 1,
          primaryPrice: 1,
          categorySlug: 1,
          'variants.unit': 1,
          'variants.price': 1,
          'variants.mrp': 1,
        }
      )
        .limit(Number(limit))
        .lean(),

      Category.find(
        {
          isActive: true,
          name: { $regex: searchRegex },
        },
        { name: 1, slug: 1, icon: 1 }
      )
        .limit(4)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      query: cleanQuery,
      data: {
        products,
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
};
