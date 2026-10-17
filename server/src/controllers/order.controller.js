// server/src/controllers/order.controller.js
import crypto from 'node:crypto';
import { prisma } from '../database/prisma.js';
import { logger } from '../config/logger.js';
import { Cart, Product } from '../models/index.js';
import { createRazorpayOrder } from '../services/payment.service.js';
import { calculateCartBreakdown } from './cart.controller.js';

const VALID_STATUS_TRANSITIONS = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
};

/**
 * Generates an enterprise-standard unique order identifier.
 * Example: ORD-20261016-A1B2
 */
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
};

/**
 * Checkout & Order Creation
 * Guarantees cross-database atomicity:
 * 1. Atomically decrements MongoDB stock with $gte check to prevent overselling.
 * 2. Creates MySQL Order, OrderItems snapshot, Payment, and CouponUsage in a transaction.
 * 3. Automatically rolls back MongoDB stock if the MySQL transaction fails.
 */
export const checkout = async (req, res, next) => {
  const reservedStockItems = [];
  try {
    const userId = req.user.id;
    const { addressId, paymentMethod, couponCode, idempotencyKey } = req.body;

    // 1. Check idempotency key if supplied
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { items: true, payment: true },
      });
      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already processed (idempotent request)',
          data: {
            order: existingOrder,
          },
        });
      }
    }

    // 2. Validate delivery address
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId, deletedAt: null },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Selected delivery address not found' },
      });
    }

    // 3. Retrieve user's cart (or merge guest cart if items are in guest session)
    let cart = await Cart.findOne({ userId });
    const sessionId = req.headers['x-session-id'];
    if ((!cart || cart.items.length === 0) && sessionId) {
      const guestCart = await Cart.findOne({ sessionId });
      if (guestCart && guestCart.items.length > 0) {
        if (!cart) {
          cart = await Cart.create({ userId, items: [] });
        }
        cart.items = guestCart.items;
        if (guestCart.couponCode && !cart.couponCode) {
          cart.couponCode = guestCart.couponCode;
        }
        await cart.save();
        await Cart.deleteOne({ _id: guestCart._id });
      }
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'CART_EMPTY', message: 'Cannot checkout with an empty cart' },
      });
    }

    // 4. Recompute live prices, stock, and coupon discounts
    const effectiveCouponCode = couponCode || cart.couponCode || null;
    const breakdown = await calculateCartBreakdown(cart.items, effectiveCouponCode, userId);

    if (breakdown.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'CART_ITEMS_UNAVAILABLE', message: 'No available items found in cart' },
      });
    }

    // Check for any out of stock items
    const oos = breakdown.items.find((it) => it.isOutOfStock || it.availableStock < it.quantity);
    if (oos) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Item "${oos.name}" has only ${oos.availableStock} units available in stock.`,
        },
      });
    }

    // 5. ATOMIC STOCK DEDUCTION IN MONGODB
    // Decrement stock atomically per item. If any item fails, rollback all previously decremented items.
    for (const item of breakdown.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          'variants.sku': item.variantSku,
          'variants.stock': { $gte: item.quantity },
          isAvailable: true,
        },
        {
          $inc: {
            'variants.$.stock': -item.quantity,
            totalStock: -item.quantity,
          },
        },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback already reserved stock in MongoDB
        for (const reserved of reservedStockItems) {
          await Product.updateOne(
            { _id: reserved.productId, 'variants.sku': reserved.variantSku },
            {
              $inc: {
                'variants.$.stock': reserved.quantity,
                totalStock: reserved.quantity,
              },
            }
          );
        }

        return res.status(409).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Could not reserve stock for "${item.name}" (${item.variantSku}). Another customer may have just purchased the remaining units.`,
          },
        });
      }

      reservedStockItems.push(item);
    }

    // 6. MYSQL TRANSACTION: Create Order, OrderItems, Payment, CouponUsage
    let orderRecord;
    try {
      const orderNumber = generateOrderNumber();

      orderRecord = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'PLACED',
            subtotal: breakdown.pricing.subtotal,
            discountAmount: breakdown.pricing.discountAmount,
            deliveryFee: breakdown.pricing.deliveryFee,
            totalAmount: breakdown.pricing.totalAmount,
            deliveryAddress: {
              fullName: address.fullName,
              phone: address.phone,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              landmark: address.landmark,
            },
            couponCode: breakdown.appliedCoupon ? breakdown.appliedCoupon.code : null,
            idempotencyKey: idempotencyKey || null,
          },
        });

        // Create order item snapshots
        const orderItemData = breakdown.items.map((it) => ({
          orderId: newOrder.id,
          mongoProductId: String(it.productId),
          nameSnapshot: it.variantSku ? `${it.name} [${it.variantSku}]` : it.name,
          priceSnapshot: it.price,
          imageSnapshot: it.image || null,
          quantity: it.quantity,
          totalPrice: it.itemTotal,
        }));

        await tx.orderItem.createMany({
          data: orderItemData,
        });

        // Initialize payment record
        const paymentStatus = paymentMethod === 'COD' ? 'PENDING' : 'PENDING';
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amount: breakdown.pricing.totalAmount,
            method: paymentMethod,
            status: paymentStatus,
          },
        });

        // Record coupon usage if coupon applied
        if (breakdown.appliedCoupon) {
          await tx.couponUsage.create({
            data: {
              couponId: breakdown.appliedCoupon.id,
              userId,
              orderId: newOrder.id,
              discountApplied: breakdown.appliedCoupon.discountAmount,
            },
          });

          await tx.coupon.update({
            where: { id: breakdown.appliedCoupon.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        return newOrder;
      });
    } catch (prismaTxErr) {
      // ROLLBACK MONGODB STOCK RESERVATIONS IF MYSQL TRANSACTION FAILS
      for (const reserved of reservedStockItems) {
        await Product.updateOne(
          { _id: reserved.productId, 'variants.sku': reserved.variantSku },
          {
            $inc: {
              'variants.$.stock': reserved.quantity,
              totalStock: reserved.quantity,
            },
          }
        );
      }
      throw prismaTxErr;
    }

    // 7. Clear user's active cart in MongoDB
    await Cart.deleteOne({ userId });

    // 8. If Razorpay, initialize gateway order
    let razorpayOrderData = null;
    if (paymentMethod === 'RAZORPAY') {
      try {
        razorpayOrderData = await createRazorpayOrder({
          amount: Number(orderRecord.totalAmount),
          currency: 'INR',
          receipt: orderRecord.orderNumber,
          notes: { orderId: orderRecord.id, userId },
        });

        // Update payment record with razorpayOrderId
        await prisma.payment.update({
          where: { orderId: orderRecord.id },
          data: { razorpayOrderId: razorpayOrderData.id },
        });
      } catch (rzpErr) {
        logger.warn(
          { err: rzpErr.message, orderId: orderRecord.id },
          'Failed to initialize Razorpay order on checkout'
        );
      }
    }

    // Fetch full order response with items & payment
    const populatedOrder = await prisma.order.findUnique({
      where: { id: orderRecord.id },
      include: { items: true, payment: true },
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: populatedOrder,
        razorpay: razorpayOrderData
          ? {
              orderId: razorpayOrderData.id,
              amount: razorpayOrderData.amount,
              currency: razorpayOrderData.currency,
              keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List customer orders with pagination.
 */
export const listMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      userId,
      ...(status && { status }),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: true,
          payment: {
            select: { method: true, status: true, razorpayPaymentId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    const totalPages = Math.ceil(total / Number(limit)) || 1;

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
      data: {
        orders,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed order view by order ID.
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        couponUsages: {
          include: { coupon: { select: { code: true, discountType: true, discountValue: true } } },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    // Role check: customer can only view own order; admins can view all
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this order' },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel order by customer.
 * Allowed only when order is in PLACED or PACKED state.
 * Releases reserved MongoDB stock back to inventory.
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { cancellationReason = 'Cancelled by customer' } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
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
        error: { code: 'FORBIDDEN', message: 'You do not have permission to cancel this order' },
      });
    }

    if (order.status !== 'PLACED' && order.status !== 'PACKED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_CANNOT_BE_CANCELLED',
          message: `Orders in "${order.status}" status cannot be cancelled.`,
        },
      });
    }

    // 1. Release stock back to MongoDB
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

    // 2. Update order status and refund payment if completed
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancellationReason,
        },
      });

      if (order.payment && order.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { orderId },
          data: { status: 'REFUNDED' },
        });
      }

      return cancelled;
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and stock restored',
      data: {
        order: updatedOrder,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update order status (Admin / State Machine).
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, cancellationReason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    // Verify valid status transition
    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition order status from "${order.status}" to "${status}". Allowed transitions: ${allowedNextStatuses.join(', ') || 'None (terminal)'}`,
        },
      });
    }

    // If transitioned to CANCELLED, release stock back to MongoDB
    if (status === 'CANCELLED') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.mongoProductId },
          {
            $inc: {
              totalStock: item.quantity,
            },
          }
        );
      }
    }

    // If transitioned to DELIVERED and COD, mark payment COMPLETED
    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(cancellationReason && { cancellationReason }),
        },
      });

      if (status === 'DELIVERED' && order.payment && order.payment.method === 'COD') {
        await tx.payment.update({
          where: { orderId },
          data: { status: 'COMPLETED' },
        });
      } else if (status === 'CANCELLED' && order.payment && order.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { orderId },
          data: { status: 'REFUNDED' },
        });
      }

      return updatedOrder;
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: {
        order: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Checkout Preview
 * Recomputes live cart pricing, item availability, delivery fees, and applied coupons
 * for the authenticated customer prior to submitting an order.
 */
export const checkoutPreview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          invalidItems: [],
          itemCount: 0,
          pricing: {
            subtotal: 0,
            totalMrp: 0,
            deliveryFee: 0,
            discountAmount: 0,
            totalAmount: 0,
            totalSavings: 0,
            freeDeliveryThreshold: 199,
            amountNeededForFreeDelivery: 199,
          },
          appliedCoupon: null,
        },
      });
    }

    const breakdown = await calculateCartBreakdown(
      cart.items,
      cart.appliedCoupon?.code || null,
      userId
    );

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (err) {
    next(err);
  }
};
