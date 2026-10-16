// server/src/middleware/auth.js
import { prisma } from '../database/prisma.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Authentication middleware that validates Bearer JWT access tokens.
 * Loads the active user from MySQL and verifies they are not blocked or deleted.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing or invalid Bearer token.',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing.',
        },
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired. Please refresh your session.',
          },
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Access token is invalid or corrupted.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account associated with this token no longer exists.',
        },
      });
    }

    if (user.isBlocked) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: 'Your account has been suspended. Please contact support.',
        },
      });
    }

    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'This account has been deactivated.',
        },
      });
    }

    // Attach verified user (without password hash) to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control (RBAC) middleware generator.
 * Enforces that req.user.role is contained within allowedRoles.
 *
 * @param  {...string} allowedRoles - e.g. 'CUSTOMER', 'ADMIN', 'SUPER_ADMIN'
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }

    next();
  };
};

/**
 * CSRF mitigation middleware for cookie-bearing endpoints (e.g. /refresh, /logout).
 * Requires the presence of a custom request header (X-Requested-With, X-Zippy-Client, or X-CSRF-Protection).
 * Browsers forbid cross-origin scripts from setting arbitrary headers without CORS preflight approval.
 */
export const requireCsrfHeader = (req, res, next) => {
  const hasCustomHeader =
    req.headers['x-requested-with'] ||
    req.headers['x-zippy-client'] ||
    req.headers['x-csrf-protection'];

  if (!hasCustomHeader) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message:
          'Security check failed: missing required custom client header (e.g., X-Requested-With or X-Zippy-Client).',
      },
    });
  }

  next();
};
