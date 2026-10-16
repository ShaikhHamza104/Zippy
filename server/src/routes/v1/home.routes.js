// server/src/routes/v1/home.routes.js
import { Router } from 'express';
import * as homeController from '../../controllers/home.controller.js';
import { cacheMiddleware } from '../../utils/cache.js';

const router = Router();

// Aggregated home screen feed (cached for 60s)
router.get('/', cacheMiddleware(60), homeController.getHomeFeed);

export default router;
