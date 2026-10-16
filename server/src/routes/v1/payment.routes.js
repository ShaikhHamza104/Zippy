// server/src/routes/v1/payment.routes.js
import { Router } from 'express';
import * as paymentController from '../../controllers/payment.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../validation/auth.validation.js';
import { verifyPaymentSchema } from '../../validation/order.validation.js';

const router = Router();

// Payment verification callback from frontend client
router.post(
  '/verify',
  requireAuth,
  validateBody(verifyPaymentSchema),
  paymentController.verifyPayment
);

// Razorpay asynchronous server-to-server webhook
router.post('/webhook', paymentController.handleWebhook);

export default router;
