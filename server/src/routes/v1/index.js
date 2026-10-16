import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Zippy REST API v1 operational',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ready: '/ready',
      apiV1: '/api/v1',
    },
  });
});

export default router;
