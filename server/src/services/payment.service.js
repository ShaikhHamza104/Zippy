// server/src/services/payment.service.js
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let razorpayClient = null;

const isRazorpayConfigured =
  Boolean(env.RAZORPAY_KEY_ID) &&
  Boolean(env.RAZORPAY_KEY_SECRET) &&
  !env.RAZORPAY_KEY_ID.includes('placeholder') &&
  !env.RAZORPAY_KEY_SECRET.includes('replace_with');

if (isRazorpayConfigured) {
  try {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
    logger.info('Razorpay payment gateway initialized successfully');
  } catch (err) {
    logger.error(
      { err },
      'Failed to initialize live Razorpay client, falling back to simulated mode'
    );
    razorpayClient = null;
  }
}

/**
 * Creates a Razorpay order or simulated equivalent for development and automated testing.
 *
 * @param {object} params
 * @param {number} params.amount - Order amount in INR (rupees)
 * @param {string} [params.currency='INR'] - Currency code
 * @param {string} params.receipt - Internal order number / receipt identifier
 * @param {object} [params.notes] - Custom metadata key-values
 * @returns {Promise<{ id: string, amount: number, currency: string, receipt: string, status: string, isSimulated: boolean }>}
 */
export const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (razorpayClient && env.NODE_ENV === 'production') {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      });
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        isSimulated: false,
      };
    } catch (err) {
      logger.error({ err, receipt }, 'Razorpay API order creation failed');
      throw new Error(`Razorpay order creation failed: ${err.message}`);
    }
  }

  // Simulated mode (Dev / Test or unconfigured credentials)
  const simulatedOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;
  logger.info(
    { simulatedOrderId, amountInPaise, receipt },
    '[DEV / TEST] Simulated Razorpay order generated'
  );

  return {
    id: simulatedOrderId,
    amount: amountInPaise,
    currency,
    receipt,
    status: 'created',
    isSimulated: true,
  };
};

/**
 * Generates a valid test signature for development and automated tests.
 *
 * @param {string} orderId
 * @param {string} paymentId
 * @returns {string} Hex signature
 */
export const generateTestRazorpaySignature = (orderId, paymentId) => {
  const secret = env.RAZORPAY_KEY_SECRET || 'dev_test_razorpay_secret_key_32_chars';
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
};

/**
 * Cryptographically verifies Razorpay payment signature.
 *
 * @param {object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @returns {boolean} Whether signature is authentic
 */
export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const secret = env.RAZORPAY_KEY_SECRET || 'dev_test_razorpay_secret_key_32_chars';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(razorpaySignature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    // In dev / test allow simulated test signature matching
    if (env.NODE_ENV !== 'production' && razorpaySignature.startsWith('simulated_sig_')) {
      return true;
    }
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

/**
 * Verifies webhook payload authenticity using Razorpay webhook secret.
 *
 * @param {string|Buffer} rawBody
 * @param {string} signature
 * @returns {boolean}
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!rawBody || !signature) return false;

  const secret = env.RAZORPAY_WEBHOOK_SECRET || 'dev_test_webhook_secret_key_32_chars';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};
