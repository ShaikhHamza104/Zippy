// server/src/routes/v1/product.routes.js
import { Router } from 'express';
import * as productController from '../../controllers/product.controller.js';
import { cacheMiddleware } from '../../utils/cache.js';
import { productQuerySchema, validateQuery } from '../../validation/catalog.validation.js';

const router = Router();

// Paginated product listing with filters and sorting (cached for 60s)
router.get(
  '/',
  validateQuery(productQuerySchema),
  cacheMiddleware(60),
  productController.getProducts
);

// Product details by slug or ObjectId with populated reviews (cached for 60s)
router.get('/:slugOrId', cacheMiddleware(60), productController.getProductBySlugOrId);

export default router;
