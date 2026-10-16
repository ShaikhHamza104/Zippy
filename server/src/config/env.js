import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { validateSuperAdminSecurity } from './securityGuards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file if it exists
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long')
    .default(
      process.env.NODE_ENV === 'test'
        ? 'test_jwt_access_secret_must_be_at_least_32_chars_long'
        : undefined
    ),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long')
    .default(
      process.env.NODE_ENV === 'test'
        ? 'test_jwt_refresh_secret_must_be_at_least_32_chars_long'
        : undefined
    ),
  JWT_RESET_PASSWORD_SECRET: z
    .string()
    .min(32, 'JWT_RESET_PASSWORD_SECRET must be at least 32 characters long')
    .default(
      process.env.NODE_ENV === 'test'
        ? 'test_jwt_reset_password_secret_32_chars_min'
        : 'test_jwt_reset_password_secret_32_chars_min'
    ),
  JWT_EMAIL_VERIFICATION_SECRET: z
    .string()
    .min(32, 'JWT_EMAIL_VERIFICATION_SECRET must be at least 32 characters long')
    .default(
      process.env.NODE_ENV === 'test'
        ? 'test_jwt_email_verification_secret_32_min'
        : 'test_jwt_email_verification_secret_32_min'
    ),
  COOKIE_SECURE: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('Zippy <no-reply@zippy.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables detected:',
    JSON.stringify(parsed.error.format(), null, 2)
  );
  process.exit(1);
}

// Guard super admin credentials against weak passwords / test domains in production
validateSuperAdminSecurity(
  process.env.SUPER_ADMIN_EMAIL,
  process.env.SUPER_ADMIN_PASSWORD,
  parsed.data.NODE_ENV
);

export const env = parsed.data;

export const isCookieSecure = () => {
  if (typeof env.COOKIE_SECURE === 'boolean') {
    return env.COOKIE_SECURE;
  }
  return env.NODE_ENV === 'production';
};
