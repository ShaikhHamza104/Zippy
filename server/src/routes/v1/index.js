import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// Mount authentication and security routes under /api/v1/auth
router.use('/auth', authRoutes);

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
    },
  });
});

export default router;
