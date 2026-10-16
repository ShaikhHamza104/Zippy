// server/src/validation/order.validation.js
import mongoose from 'mongoose';
import { z } from 'zod';

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;

export const addToCartSchema = z
  .object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .refine((val) => mongoose.isValidObjectId(val), 'Invalid product ObjectId format'),
    variantSku: z.string({ required_error: 'Variant SKU is required' }).trim().min(1),
    quantity: z.coerce
      .number()
      .int()
      .min(1, 'Quantity must be at least 1')
      .max(50, 'Max 50 items allowed per SKU'),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.coerce
      .number()
      .int()
      .min(0, 'Quantity cannot be negative')
      .max(50, 'Max 50 items allowed per SKU'),
  })
  .strict();

export const mergeCartSchema = z
  .object({
    guestSessionId: z.string({ required_error: 'Guest session ID is required' }).trim().min(1),
  })
  .strict();

export const applyCouponSchema = z
  .object({
    code: z.string({ required_error: 'Coupon code is required' }).trim().min(1).toUpperCase(),
  })
  .strict();

export const validateCouponSchema = z
  .object({
    code: z.string({ required_error: 'Coupon code is required' }).trim().min(1).toUpperCase(),
    subtotal: z.number().min(0).optional().default(0),
  })
  .strict();

export const createAddressSchema = z
  .object({
    fullName: z.string({ required_error: 'Full name is required' }).trim().min(2).max(100),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, 'Invalid phone number format'),
    addressLine1: z.string({ required_error: 'Address line 1 is required' }).trim().min(5).max(255),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    city: z.string({ required_error: 'City is required' }).trim().min(2).max(100),
    state: z.string({ required_error: 'State is required' }).trim().min(2).max(100),
    pincode: z
      .string({ required_error: 'Pincode is required' })
      .trim()
      .regex(pincodeRegex, 'Pincode must be a valid 6-digit Indian postal code'),
    landmark: z.string().trim().max(100).optional().nullable(),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const updateAddressSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().regex(phoneRegex, 'Invalid phone number format').optional(),
    addressLine1: z.string().trim().min(5).max(255).optional(),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(2).max(100).optional(),
    state: z.string().trim().min(2).max(100).optional(),
    pincode: z
      .string()
      .trim()
      .regex(pincodeRegex, 'Pincode must be a valid 6-digit Indian postal code')
      .optional(),
    landmark: z.string().trim().max(100).optional().nullable(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const checkoutSchema = z
  .object({
    addressId: z
      .string({ required_error: 'Delivery address ID is required' })
      .uuid('Invalid address UUID format'),
    paymentMethod: z.enum(['COD', 'RAZORPAY'], {
      required_error: 'Payment method must be COD or RAZORPAY',
    }),
    couponCode: z.string().trim().toUpperCase().optional().nullable(),
    idempotencyKey: z.string().trim().max(128).optional().nullable(),
  })
  .strict();

export const verifyPaymentSchema = z
  .object({
    orderId: z.string({ required_error: 'Order ID is required' }).uuid('Invalid order UUID format'),
    razorpayOrderId: z.string({ required_error: 'Razorpay order ID is required' }).trim().min(1),
    razorpayPaymentId: z
      .string({ required_error: 'Razorpay payment ID is required' })
      .trim()
      .min(1),
    razorpaySignature: z.string({ required_error: 'Razorpay signature is required' }).trim().min(1),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    cancellationReason: z.string().trim().min(3).max(255).default('Cancelled by customer'),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
    cancellationReason: z.string().trim().max(255).optional(),
  })
  .strict();
