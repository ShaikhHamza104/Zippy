// server/src/validation/admin.validation.js
import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Product variant schema
const productVariantSchema = z.object({
  unit: z.string({ required_error: 'Variant unit is required' }).trim().min(1),
  price: z.coerce.number({ required_error: 'Variant price is required' }).min(0),
  mrp: z.coerce.number({ required_error: 'Variant MRP is required' }).min(0),
  stock: z.coerce.number({ required_error: 'Variant stock is required' }).int().min(0),
  sku: z.string({ required_error: 'Variant SKU is required' }).trim().min(2).toUpperCase(),
});

const isValidImagePath = (val) =>
  typeof val === 'string' &&
  (val.startsWith('http://') ||
    val.startsWith('https://') ||
    val.startsWith('/uploads/') ||
    val.startsWith('data:image/'));

// Product image schema
const productImageSchema = z.object({
  url: z
    .string({ required_error: 'Image URL is required' })
    .trim()
    .min(1, 'Image URL cannot be empty')
    .refine(isValidImagePath, {
      message: 'Invalid image URL. Must be http(s) URL or /uploads path',
    }),
  alt: z.string().trim().optional().default(''),
  isPrimary: z.boolean().optional().default(false),
});

export const adminProductCreateSchema = z
  .object({
    name: z.string({ required_error: 'Product name is required' }).trim().min(2).max(200),
    slug: z.string().trim().toLowerCase().optional(),
    description: z.string({ required_error: 'Product description is required' }).trim().min(5),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .regex(objectIdRegex, 'Invalid category ObjectId format'),
    brand: z.string().trim().optional().default('Zippy Fresh'),
    images: z.array(productImageSchema).min(1, 'At least one product image is required'),
    variants: z.array(productVariantSchema).min(1, 'At least one product variant is required'),
    tags: z.array(z.string().trim()).optional().default([]),
    pincodeServiceable: z.array(z.string().trim()).optional().default(['*']),
    isAvailable: z.boolean().optional().default(true),
  })
  .strict();

export const adminProductUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    slug: z.string().trim().toLowerCase().optional(),
    description: z.string().trim().min(5).optional(),
    categoryId: z.string().regex(objectIdRegex, 'Invalid category ObjectId format').optional(),
    brand: z.string().trim().optional(),
    images: z.array(productImageSchema).min(1).optional(),
    variants: z.array(productVariantSchema).min(1).optional(),
    tags: z.array(z.string().trim()).optional(),
    pincodeServiceable: z.array(z.string().trim()).optional(),
    isAvailable: z.boolean().optional(),
  })
  .strict();

export const adminStockUpdateSchema = z
  .object({
    sku: z.string().trim().min(1).toUpperCase().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    adjustment: z.coerce.number().int().optional(),
  })
  .refine((data) => data.stock !== undefined || data.adjustment !== undefined, {
    message: 'Either stock or adjustment must be provided',
  });

export const adminCategoryCreateSchema = z
  .object({
    name: z.string({ required_error: 'Category name is required' }).trim().min(2).max(100),
    slug: z.string().trim().toLowerCase().optional(),
    image: z
      .string({ required_error: 'Category image URL is required' })
      .trim()
      .min(1, 'Category image URL cannot be empty')
      .refine(isValidImagePath, {
        message: 'Invalid image URL. Must be http(s) URL or /uploads path',
      }),
    description: z.string().trim().optional().default(''),
    icon: z.string().trim().optional().default('📦'),
    displayOrder: z.coerce.number().int().optional().default(0),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const adminCategoryUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z.string().trim().toLowerCase().optional(),
    image: z
      .string()
      .trim()
      .refine((val) => !val || isValidImagePath(val), {
        message: 'Invalid image URL. Must be http(s) URL or /uploads path',
      })
      .optional(),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    displayOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adminCouponCreateSchema = z
  .object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .trim()
      .min(2)
      .max(30)
      .toUpperCase(),
    discountType: z.enum(['PERCENTAGE', 'FLAT'], {
      required_error: 'Discount type must be PERCENTAGE or FLAT',
    }),
    discountValue: z.coerce.number({ required_error: 'Discount value is required' }).min(1),
    minOrderAmount: z.coerce.number().min(0).optional().default(0),
    maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date({ required_error: 'Expiry date is required' }),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const adminCouponUpdateSchema = z
  .object({
    code: z.string().trim().min(2).max(30).toUpperCase().optional(),
    discountType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
    discountValue: z.coerce.number().min(1).optional(),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adminBannerCreateSchema = z
  .object({
    title: z.string({ required_error: 'Banner title is required' }).trim().min(2).max(150),
    imageUrl: z
      .string({ required_error: 'Banner image URL is required' })
      .trim()
      .min(1, 'Banner image URL cannot be empty')
      .refine(isValidImagePath, {
        message: 'Invalid image URL. Must be http(s) URL or /uploads path',
      }),
    linkUrl: z.string().trim().optional().default('/categories'),
    badgeText: z.string().trim().optional().default('SUPER SAVINGS'),
    displayOrder: z.coerce.number().int().optional().default(0),
    isActive: z.boolean().optional().default(true),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export const adminBannerUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    imageUrl: z
      .string()
      .trim()
      .refine((val) => !val || isValidImagePath(val), {
        message: 'Invalid image URL. Must be http(s) URL or /uploads path',
      })
      .optional(),
    linkUrl: z.string().trim().optional(),
    badgeText: z.string().trim().optional(),
    displayOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export const adminOrderStatusSchema = z
  .object({
    status: z.enum(['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], {
      required_error: 'Status is required',
    }),
    cancellationReason: z.string().trim().optional(),
  })
  .strict();

export const adminOrderCancelSchema = z
  .object({
    cancellationReason: z
      .string({ required_error: 'Cancellation reason is required' })
      .trim()
      .min(3)
      .max(255),
  })
  .strict();

export const adminBlockCustomerSchema = z
  .object({
    isBlocked: z.boolean({ required_error: 'isBlocked boolean is required' }),
    reason: z.string().trim().optional().default('Blocked by admin'),
  })
  .strict();
