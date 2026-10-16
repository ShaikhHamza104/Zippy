// server/src/controllers/payment.controller.js
import { prisma } from '../database/prisma.js';
import { Product } from '../models/index.js';
import { verifyRazorpaySignature, verifyWebhookSignature } from '../services/payment.service.js';

/**
 * Verify Razorpay payment signature upon customer completing checkout.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.user.id;

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    if (order.userId !== userId && req.user.role === 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this order' },
      });
    }

    // Verify cryptographic signature
    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_SIGNATURE',
          message: 'Payment verification failed: invalid signature.',
        },
      });
    }

    // Update payment record in database
    const updatedPayment = await prisma.payment.update({
      where: { orderId },
      data: {
        status: 'COMPLETED',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        rawResponse: {
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'CLIENT_CALLBACK',
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and captured successfully',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: updatedPayment.status,
        razorpayPaymentId: updatedPayment.razorpayPaymentId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handles incoming Razorpay webhook notifications.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = req.body;

    // Verify webhook signature if configured
    if (signature && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isAuthentic = verifyWebhookSignature(JSON.stringify(payload), signature);
      if (!isAuthentic) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const rzpOrderId = paymentEntity?.order_id;

    if (!event || !rzpOrderId) {
      return res.status(200).json({ status: 'ignored', message: 'Missing event or order_id' });
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: rzpOrderId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return res.status(200).json({ status: 'ignored', message: 'Order not found' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId: paymentEntity.id || payment.razorpayPaymentId,
          rawResponse: payload,
        },
      });
    } else if (event === 'payment.failed') {
      // Release reserved stock back to MongoDB on payment failure
      if (payment.order && payment.order.status === 'PLACED') {
        for (const item of payment.order.items) {
          const product = await Product.findById(item.mongoProductId);
          if (product && product.variants?.length) {
            const skuMatch = item.nameSnapshot?.match(/\[(.*?)\]/);
            const targetSku = skuMatch ? skuMatch[1] : null;

            let variant = product.variants.find((v) => v.sku === targetSku);
            if (!variant) {
              variant =
                product.variants.find((v) => Number(v.price) === Number(item.priceSnapshot)) ||
                product.variants[0];
            }

            await Product.updateOne(
              { _id: item.mongoProductId, 'variants.sku': variant.sku },
              {
                $inc: {
                  'variants.$.stock': item.quantity,
                  totalStock: item.quantity,
                },
              }
            );
          }
        }

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED', rawResponse: payload },
          }),
          prisma.order.update({
            where: { id: payment.order.id },
            data: {
              status: 'CANCELLED',
              cancellationReason: 'Payment failed at payment gateway webhook',
            },
          }),
        ]);
      }
    }

    res.status(200).json({ status: 'ok', eventProcessed: event });
  } catch (err) {
    next(err);
  }
};

/**
 * Reclaims stock for abandoned/expired pending Razorpay orders (>15 minutes old).
 */
export const releaseAbandonedOrders = async (olderThanMinutes = 15) => {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const abandonedOrders = await prisma.order.findMany({
    where: {
      status: 'PLACED',
      createdAt: { lt: cutoff },
      payment: {
        method: 'RAZORPAY',
        status: 'PENDING',
      },
    },
    include: { items: true, payment: true },
  });

  let releasedCount = 0;
  for (const order of abandonedOrders) {
    // Restore MongoDB stock
    for (const item of order.items) {
      const product = await Product.findById(item.mongoProductId);
      if (product && product.variants?.length) {
        const skuMatch = item.nameSnapshot?.match(/\[(.*?)\]/);
        const targetSku = skuMatch ? skuMatch[1] : null;

        let variant = product.variants.find((v) => v.sku === targetSku);
        if (!variant) {
          variant =
            product.variants.find((v) => Number(v.price) === Number(item.priceSnapshot)) ||
            product.variants[0];
        }

        await Product.updateOne(
          { _id: item.mongoProductId, 'variants.sku': variant.sku },
          {
            $inc: {
              'variants.$.stock': item.quantity,
              totalStock: item.quantity,
            },
          }
        );
      }
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Order cancelled due to abandoned payment timeout',
        },
      }),
      prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'FAILED' },
      }),
    ]);

    releasedCount++;
  }

  return { releasedCount, abandonedOrdersCount: abandonedOrders.length };
};
