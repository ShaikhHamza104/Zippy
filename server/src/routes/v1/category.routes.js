// server/src/routes/v1/category.routes.js
import { Router } from 'express';
import * as categoryController from '../../controllers/category.controller.js';
import { cacheMiddleware } from '../../utils/cache.js';
import { slugParamSchema, validateParams } from '../../validation/catalog.validation.js';

const router = Router();

// List all categories (cached for 120s)
router.get('/', cacheMiddleware(120), categoryController.getCategories);

// Get category details by slug (cached for 120s)
router.get(
  '/:slug',
  validateParams(slugParamSchema),
  cacheMiddleware(120),
  categoryController.getCategoryBySlug
);

export default router;
