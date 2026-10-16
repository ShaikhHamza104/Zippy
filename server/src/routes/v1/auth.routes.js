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

// Authentication API discovery endpoint
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Zippy Authentication API v1 operational',
    endpoints: {
      register: {
        method: 'POST',
        path: '/api/v1/auth/register',
        description: 'Customer self-registration',
      },
      login: {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Authenticate user & issue tokens',
      },
      logout: {
        method: 'POST',
        path: '/api/v1/auth/logout',
        description: 'Revoke session & clear cookie',
      },
      refresh: {
        method: 'POST',
        path: '/api/v1/auth/refresh',
        description: 'Rotate refresh token & get access token',
      },
      forgotPassword: {
        method: 'POST',
        path: '/api/v1/auth/forgot-password',
        description: 'Request password reset instructions',
      },
      resetPassword: {
        method: 'POST',
        path: '/api/v1/auth/reset-password',
        description: 'Reset password using token',
      },
      changePassword: {
        method: 'POST',
        path: '/api/v1/auth/change-password',
        description: 'Change password (authenticated)',
      },
      verifyEmail: {
        method: 'GET / POST',
        path: '/api/v1/auth/verify-email',
        description: 'Verify customer email address',
      },
      me: {
        method: 'GET',
        path: '/api/v1/auth/me',
        description: 'Current authenticated user profile',
      },
      createAdmin: {
        method: 'POST',
        path: '/api/v1/auth/create-admin',
        description: 'Create admin user (SUPER_ADMIN only)',
      },
    },
  });
});

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
