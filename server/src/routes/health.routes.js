import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (_req, res) => {
  // In Phase 1, basic system readiness. Database connectivity checks will extend in Phase 2.
  res.status(200).json({
    status: 'ready',
    service: 'zippy-api',
    checks: {
      server: 'ok',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
