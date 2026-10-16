// server/src/routes/v1/search.routes.js
import { Router } from 'express';
import * as searchController from '../../controllers/search.controller.js';
import {
  searchQuerySchema,
  suggestionsQuerySchema,
  validateQuery,
} from '../../validation/catalog.validation.js';

const router = Router();

// Full-text product search with text score and filters
router.get('/', validateQuery(searchQuerySchema), searchController.searchProducts);

// Fast autocomplete suggestions for debounced client input
router.get('/suggestions', validateQuery(suggestionsQuerySchema), searchController.getSuggestions);
router.get('/autocomplete', validateQuery(suggestionsQuerySchema), searchController.getSuggestions);

export default router;
