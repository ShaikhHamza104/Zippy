// server/src/routes/v1/coupon.routes.js
import { Router } from 'express';
import * as couponController from '../../controllers/coupon.controller.js';
import { optionalAuth } from '../../middleware/auth.js';
import { validateBody } from '../../validation/auth.validation.js';
import { validateCouponSchema } from '../../validation/order.validation.js';

const router = Router();

router.get('/', couponController.listCoupons);
router.post(
  '/validate',
  optionalAuth,
  validateBody(validateCouponSchema),
  couponController.validateCoupon
);

export default router;
