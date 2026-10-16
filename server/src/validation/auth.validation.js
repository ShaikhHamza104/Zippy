// server/src/validation/auth.validation.js
import { z } from 'zod';

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must not exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, 'Please provide a valid phone number')
      .optional()
      .nullable(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict(); // Rejects extraneous injected fields such as role or isBlocked

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  })
  .strict();

export const createAdminSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must not exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, 'Please provide a valid phone number')
      .optional()
      .nullable(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).min(1, 'Token is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password must not exceed 128 characters'),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z
      .string({ required_error: 'Verification token is required' })
      .min(1, 'Token is required'),
  })
  .strict();

/**
 * Express middleware to validate request body against a Zod schema.
 * @param {z.ZodSchema} schema
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
      },
    });
  }

  req.body = result.data;
  next();
};
