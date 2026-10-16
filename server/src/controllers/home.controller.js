// server/src/controllers/home.controller.js
import { Banner, Category, Product } from '../models/index.js';

/**
 * Aggregates home feed payload: promotional banners, categories, featured category rails, and trending items.
 */
export const getHomeFeed = async (req, res, next) => {
  try {
    const [banners, categories, trendingProducts] = await Promise.all([
      Banner.find({ isActive: true }).sort({ displayOrder: 1 }).lean(),
      Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean(),
      Product.find({ isAvailable: true })
        .sort({ ratingAverage: -1, reviewCount: -1 })
        .limit(8)
        .lean(),
    ]);

    // Build featured product sections for the top 4 grocery categories
    const featuredCategorySlice = categories.slice(0, 4);
    const featuredSections = await Promise.all(
      featuredCategorySlice.map(async (cat) => {
        const items = await Product.find({
          categoryId: cat._id,
          isAvailable: true,
        })
          .sort({ ratingAverage: -1, createdAt: -1 })
          .limit(6)
          .lean();

        return {
          categoryId: cat._id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          categoryIcon: cat.icon,
          products: items,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        banners,
        categories,
        featuredSections,
        trendingProducts,
      },
    });
  } catch (err) {
    next(err);
  }
};
