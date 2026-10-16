// server/src/routes/v1/auth.routes.js
import { Router } from 'express';
import * as authController from '../../controllers/auth.controller.js';
import { requireAuth, requireCsrfHeader, requireRole } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import {
  changePasswordSchema,
  createAdminSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validateBody,
} from '../../validation/auth.validation.js';

const router = Router();

// Public registration & authentication
router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);

router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);

// Session lifecycle (CSRF-protected via custom header)
router.post('/refresh', requireCsrfHeader, authController.refresh);
router.post('/logout', requireCsrfHeader, authController.logout);

// Password recovery & management
router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  authController.changePassword
);

// Email verification (supports both POST with body and GET with query token)
router.post('/verify-email', authController.verifyEmail);
router.get('/verify-email', authController.verifyEmail);

// User profile
router.get('/me', requireAuth, authController.me);

// Administrative privilege delegation: Only SUPER_ADMIN can create ADMIN accounts
router.post(
  '/create-admin',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validateBody(createAdminSchema),
  authController.createAdmin
);

// Alias for RESTful admin creation endpoint
router.post(
  '/admins',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validateBody(createAdminSchema),
  authController.createAdmin
);

export default router;
