// server/src/controllers/category.controller.js
import { Category, Product } from '../models/index.js';

/**
 * Get all active categories with product counts, sorted by displayOrder.
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Aggregate product counts per category for rich client navigation
    const counts = await Product.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(String(cat._id)) || 0,
    }));

    res.status(200).json({
      success: true,
      count: enrichedCategories.length,
      data: {
        categories: enrichedCategories,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single category details by slug.
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with slug "${slug}" was not found.`,
        },
      });
    }

    const productCount = await Product.countDocuments({
      categoryId: category._id,
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      data: {
        category: {
          ...category,
          productCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
