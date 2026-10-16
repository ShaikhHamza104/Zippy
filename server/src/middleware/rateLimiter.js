// server/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Standard error response generator for rate limiting violations.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  });
};

/**
 * Strict rate limiter applied to sensitive authentication routes:
 * - /api/v1/auth/login
 * - /api/v1/auth/register
 * - /api/v1/auth/forgot-password
 * - /api/v1/auth/reset-password
 *
 * In test mode: bypassed to ensure test suites can execute without throttle errors.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : 10, // 10 attempts per 15 min in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () =>
    env.NODE_ENV === 'test' ||
    process.env.ENABLE_RATE_LIMIT === 'false' ||
    process.env.BENCHMARK_MODE === 'true',
});

/**
 * General API rate limiter for standard endpoints.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () =>
    env.NODE_ENV === 'test' ||
    process.env.ENABLE_RATE_LIMIT === 'false' ||
    process.env.BENCHMARK_MODE === 'true',
});
