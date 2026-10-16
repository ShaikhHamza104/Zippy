// server/src/routes/v1/cart.routes.js
import { Router } from 'express';
import * as cartController from '../../controllers/cart.controller.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../validation/auth.validation.js';
import {
  addToCartSchema,
  applyCouponSchema,
  mergeCartSchema,
  updateCartItemSchema,
} from '../../validation/order.validation.js';

const router = Router();

// Cart discovery / read
router.get('/', optionalAuth, cartController.getCart);

// Item modifications
router.post('/items', optionalAuth, validateBody(addToCartSchema), cartController.addItemToCart);
router.put(
  '/items/:sku',
  optionalAuth,
  validateBody(updateCartItemSchema),
  cartController.updateCartItem
);
router.delete('/items/:sku', optionalAuth, cartController.removeCartItem);
router.delete('/', optionalAuth, cartController.clearCart);

// Coupon management
router.post('/coupon', optionalAuth, validateBody(applyCouponSchema), cartController.applyCoupon);
router.delete('/coupon', optionalAuth, cartController.removeCoupon);

// Guest to user cart merge (requires authentication)
router.post('/merge', requireAuth, validateBody(mergeCartSchema), cartController.mergeGuestCart);

export default router;
