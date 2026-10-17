// server/src/routes/v1/order.routes.js
import { Router } from 'express';
import * as orderController from '../../controllers/order.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../validation/auth.validation.js';
import {
  cancelOrderSchema,
  checkoutSchema,
  updateOrderStatusSchema,
} from '../../validation/order.validation.js';

const router = Router();

// All order endpoints require authentication
router.use(requireAuth);

router.get('/checkout/preview', orderController.checkoutPreview);
router.post('/checkout', validateBody(checkoutSchema), orderController.checkout);
router.get('/', orderController.listMyOrders);
router.get('/:orderId', orderController.getOrderById);
router.post('/:orderId/cancel', validateBody(cancelOrderSchema), orderController.cancelOrder);

// Admin status update (Role-restricted)
router.patch(
  '/:orderId/status',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
