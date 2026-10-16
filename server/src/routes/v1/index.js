import { Router } from 'express';
import addressRoutes from './address.routes.js';
import authRoutes from './auth.routes.js';
import cartRoutes from './cart.routes.js';
import categoryRoutes from './category.routes.js';
import couponRoutes from './coupon.routes.js';
import homeRoutes from './home.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import productRoutes from './product.routes.js';
import searchRoutes from './search.routes.js';
import serviceabilityRoutes from './serviceability.routes.js';

const router = Router();

// Mount authentication and security routes
router.use('/auth', authRoutes);

// Mount catalog and browsing domain routes
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/search', searchRoutes);
router.use('/home', homeRoutes);
router.use('/feed', homeRoutes); // Alias for home feed
router.use('/serviceability', serviceabilityRoutes);
router.use('/pincodes', serviceabilityRoutes); // Alias for pincode check

// Mount commerce, cart, checkout, orders, and payment routes (Phase 5)
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

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
      cart: '/api/v1/cart',
      addresses: '/api/v1/addresses',
      coupons: '/api/v1/coupons',
      orders: '/api/v1/orders',
      payments: '/api/v1/payments',
      docs: '/api/docs',
    },
  });
});

export default router;
