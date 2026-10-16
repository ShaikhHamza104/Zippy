import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import homeRoutes from './home.routes.js';
import productRoutes from './product.routes.js';
import searchRoutes from './search.routes.js';
import serviceabilityRoutes from './serviceability.routes.js';

const router = Router();

// Mount authentication and security routes
router.use('/auth', authRoutes);

// Mount catalog and customer domain routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/search', searchRoutes);
router.use('/home', homeRoutes);
router.use('/feed', homeRoutes); // Alias for home feed
router.use('/serviceability', serviceabilityRoutes);
router.use('/pincodes', serviceabilityRoutes); // Alias for pincode check

router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Zippy REST API v1 operational',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      apiV1: '/api/v1',
      auth: '/api/v1/auth',
      categories: '/api/v1/categories',
      products: '/api/v1/products',
      search: '/api/v1/search',
      home: '/api/v1/home',
      serviceability: '/api/v1/serviceability',
      docs: '/api/docs',
    },
  });
});

export default router;
