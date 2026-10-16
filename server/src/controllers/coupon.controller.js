// server/src/controllers/coupon.controller.js
import { prisma } from '../database/prisma.js';

/**
 * List all active, currently valid public coupons.
 */
export const listCoupons = async (req, res, next) => {
  try {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
        validUntil: true,
      },
      orderBy: { minOrderAmount: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: {
        coupons,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Validate a coupon code against a prospective order subtotal.
 */
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    const userId = req.user?.id || null;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_CODE_REQUIRED', message: 'Coupon code is required' },
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    const now = new Date();
    if (!coupon || !coupon.isActive || coupon.validFrom > now || coupon.validUntil < now) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COUPON', message: 'Coupon code is invalid or has expired' },
      });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_LIMIT_REACHED', message: 'Coupon usage limit has been reached' },
      });
    }

    if (userId) {
      const usageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (usageCount >= 1) {
        return res.status(400).json({
          success: false,
          error: { code: 'COUPON_ALREADY_USED', message: 'You have already redeemed this coupon' },
        });
      }
    }

    const numSubtotal = Number(subtotal);
    if (numSubtotal < Number(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIN_ORDER_AMOUNT_NOT_MET',
          message: `Minimum order amount for coupon "${cleanCode}" is ₹${coupon.minOrderAmount}`,
          minOrderAmount: Number(coupon.minOrderAmount),
        },
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      const rawDiscount = (numSubtotal * Number(coupon.discountValue)) / 100;
      discountAmount = coupon.maxDiscountAmount
        ? Math.min(rawDiscount, Number(coupon.maxDiscountAmount))
        : rawDiscount;
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), numSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    res.status(200).json({
      success: true,
      message: `Coupon "${cleanCode}" is valid`,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
          minOrderAmount: Number(coupon.minOrderAmount),
          discountAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
