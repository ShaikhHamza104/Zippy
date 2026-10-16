// server/src/validation/catalog.validation.js
import { z } from 'zod';

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  brand: z.string().trim().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z
    .enum(['price_asc', 'price_desc', 'rating', 'newest', 'popular', 'relevance'])
    .default('newest'),
});

export const searchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Search query parameter "q" is required' })
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).default('relevance'),
});

export const suggestionsQuerySchema = z.object({
  q: z
    .string({ required_error: 'Query parameter "q" is required' })
    .trim()
    .min(1, 'Query parameter cannot be empty')
    .max(50, 'Query parameter cannot exceed 50 characters'),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Slug parameter is required'),
});

export const pincodeParamSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Pincode must be a valid 6-digit Indian postal code'),
});

/**
 * Validates request query parameters against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details,
      },
    });
  }
  req.query = result.data;
  next();
};

/**
 * Validates request route parameters against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid route parameters',
        details,
      },
    });
  }
  req.params = result.data;
  next();
};
