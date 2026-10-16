// server/src/controllers/cart.controller.js
import { prisma } from '../database/prisma.js';
import { Cart, Product } from '../models/index.js';

const FREE_DELIVERY_THRESHOLD = 199;
const STANDARD_DELIVERY_FEE = 15;

/**
 * Recomputes cart totals directly against live database state.
 * Never trusts client-supplied pricing.
 *
 * @param {Array} rawItems
 * @param {string|null} couponCode
 * @param {string|null} userId
 * @returns {Promise<object>}
 */
export const calculateCartBreakdown = async (rawItems = [], couponCode = null, userId = null) => {
  let subtotal = 0;
  let totalMrp = 0;
  const enrichedItems = [];
  const invalidItems = [];

  for (const item of rawItems) {
    const product = await Product.findById(item.productId).lean();
    if (!product || !product.isAvailable) {
      invalidItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        reason: 'PRODUCT_UNAVAILABLE',
      });
      continue;
    }

    const variant = product.variants?.find((v) => v.sku === item.variantSku);
    if (!variant) {
      invalidItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        reason: 'VARIANT_NOT_FOUND',
      });
      continue;
    }

    const livePrice = Number(variant.price);
    const liveMrp = Number(variant.mrp);
    const availableStock = Number(variant.stock);
    const requestedQty = Math.max(1, Number(item.quantity));
    const effectiveQty = Math.min(requestedQty, Math.max(availableStock, 0));

    const itemTotal = livePrice * effectiveQty;
    const itemMrpTotal = liveMrp * effectiveQty;

    subtotal += itemTotal;
    totalMrp += itemMrpTotal;

    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || '';

    enrichedItems.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      variantSku: variant.sku,
      unit: variant.unit,
      price: livePrice,
      mrp: liveMrp,
      quantity: effectiveQty,
      availableStock,
      isOutOfStock: availableStock <= 0,
      image: primaryImage,
      itemTotal,
      savings: Math.max(0, itemMrpTotal - itemTotal),
    });
  }

  // Delivery fee calculation
  const deliveryFee =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;

  // Coupon validation and discount computation
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode && subtotal > 0) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
    });

    const now = new Date();
    if (
      coupon &&
      coupon.isActive &&
      coupon.validFrom <= now &&
      coupon.validUntil >= now &&
      (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) &&
      subtotal >= Number(coupon.minOrderAmount)
    ) {
      // Check user specific usage if user is authenticated
      let canUse = true;
      if (userId) {
        const userUsageCount = await prisma.couponUsage.count({
          where: { couponId: coupon.id, userId },
        });
        if (userUsageCount >= 1) {
          canUse = false; // 1 use per customer
        }
      }

      if (canUse) {
        if (coupon.discountType === 'PERCENTAGE') {
          const rawDiscount = (subtotal * Number(coupon.discountValue)) / 100;
          discountAmount = coupon.maxDiscountAmount
            ? Math.min(rawDiscount, Number(coupon.maxDiscountAmount))
            : rawDiscount;
        } else {
          // FLAT discount
          discountAmount = Math.min(Number(coupon.discountValue), subtotal);
        }

        discountAmount = Math.round(discountAmount * 100) / 100;

        appliedCoupon = {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          discountAmount,
        };
      }
    }
  }

  const totalAmount = Math.max(
    0,
    Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100
  );
  const totalSavings = Math.max(0, Math.round((totalMrp - subtotal + discountAmount) * 100) / 100);

  return {
    items: enrichedItems,
    invalidItems,
    itemCount: enrichedItems.reduce((acc, curr) => acc + curr.quantity, 0),
    pricing: {
      subtotal: Math.round(subtotal * 100) / 100,
      totalMrp: Math.round(totalMrp * 100) / 100,
      deliveryFee,
      discountAmount,
      totalAmount,
      totalSavings,
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      amountNeededForFreeDelivery: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal),
    },
    appliedCoupon,
  };
};

/**
 * Resolves or initializes cart from request session or authenticated user.
 */
const resolveCart = async (req) => {
  const userId = req.user?.id || null;
  const sessionId = req.headers['x-session-id'] || req.query.sessionId || null;

  if (userId) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }
    return { cart, userId, sessionId: null };
  }

  if (sessionId) {
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
    return { cart, userId: null, sessionId };
  }

  return { cart: null, userId: null, sessionId: null };
};

/**
 * Get current cart with real-time price & stock recomputation.
 */
export const getCart = async (req, res, next) => {
  try {
    const { cart, userId, sessionId } = await resolveCart(req);

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          pricing: {
            subtotal: 0,
            deliveryFee: 0,
            discountAmount: 0,
            totalAmount: 0,
            totalSavings: 0,
          },
          appliedCoupon: null,
          sessionId: null,
        },
      });
    }

    const breakdown = await calculateCartBreakdown(cart.items, cart.couponCode, userId);

    res.status(200).json({
      success: true,
      data: {
        cartId: cart._id,
        userId: cart.userId,
        sessionId,
        couponCode: cart.couponCode || null,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add or increment item in cart.
 */
export const addItemToCart = async (req, res, next) => {
  try {
    const { productId, variantSku, quantity = 1 } = req.body;
    let { cart, userId, sessionId } = await resolveCart(req);

    // If neither user nor session exists, generate a session ID
    if (!cart) {
      sessionId = `sess_${crypto.randomUUID()}`;
      cart = await Cart.create({ sessionId, items: [] });
    }

    // Verify product & variant existence and available stock
    const product = await Product.findOne({ _id: productId, isAvailable: true }).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found or unavailable' },
      });
    }

    const variant = product.variants?.find((v) => v.sku === variantSku);
    if (!variant) {
      return res.status(404).json({
        success: false,
        error: { code: 'VARIANT_NOT_FOUND', message: 'Product variant SKU not found' },
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${variant.stock} units available in stock.`,
          availableStock: variant.stock,
        },
      });
    }

    const existingIndex = cart.items.findIndex(
      (it) => String(it.productId) === String(productId) && it.variantSku === variantSku
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + Number(quantity);
      if (newQty > variant.stock) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Cannot add more. Total in cart would exceed stock (${variant.stock}).`,
            availableStock: variant.stock,
          },
        });
      }
      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].priceAtAdd = Number(variant.price);
    } else {
      cart.items.push({
        productId: product._id,
        variantSku: variant.sku,
        unit: variant.unit,
        quantity: Number(quantity),
        priceAtAdd: Number(variant.price),
      });
    }

    await cart.save();

    const breakdown = await calculateCartBreakdown(cart.items, cart.couponCode, userId);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: {
        cartId: cart._id,
        sessionId: cart.sessionId || null,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update quantity for specific SKU in cart.
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { quantity } = req.body;
    const { cart, userId, sessionId } = await resolveCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
      });
    }

    const itemIndex = cart.items.findIndex((it) => it.variantSku === sku);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_IN_CART', message: 'Item SKU not in cart' },
      });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const product = await Product.findById(cart.items[itemIndex].productId).lean();
      const variant = product?.variants?.find((v) => v.sku === sku);

      if (!variant || variant.stock < quantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Only ${variant?.stock || 0} units available in stock.`,
            availableStock: variant?.stock || 0,
          },
        });
      }

      cart.items[itemIndex].quantity = Number(quantity);
      cart.items[itemIndex].priceAtAdd = Number(variant.price);
    }

    await cart.save();

    const breakdown = await calculateCartBreakdown(cart.items, cart.couponCode, userId);

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: {
        cartId: cart._id,
        sessionId,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Remove an item from the cart by SKU.
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { cart, userId, sessionId } = await resolveCart(req);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
      });
    }

    cart.items = cart.items.filter((it) => it.variantSku !== sku);
    await cart.save();

    const breakdown = await calculateCartBreakdown(cart.items, cart.couponCode, userId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cartId: cart._id,
        sessionId,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Clears all items and coupons from the cart.
 */
export const clearCart = async (req, res, next) => {
  try {
    const { cart, sessionId } = await resolveCart(req);

    if (cart) {
      cart.items = [];
      cart.couponCode = null;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        pricing: {
          subtotal: 0,
          deliveryFee: 0,
          discountAmount: 0,
          totalAmount: 0,
        },
        appliedCoupon: null,
        sessionId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Applies a coupon code to the active cart.
 */
export const applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const { cart, userId, sessionId } = await resolveCart(req);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'CART_EMPTY', message: 'Cannot apply coupon to an empty cart' },
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
        error: { code: 'INVALID_COUPON', message: 'Coupon code is invalid or expired' },
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

    // Recompute subtotal to verify minOrderAmount
    const preliminaryBreakdown = await calculateCartBreakdown(cart.items, null, userId);
    if (preliminaryBreakdown.pricing.subtotal < Number(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIN_ORDER_AMOUNT_NOT_MET',
          message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`,
          minOrderAmount: Number(coupon.minOrderAmount),
        },
      });
    }

    cart.couponCode = cleanCode;
    await cart.save();

    const breakdown = await calculateCartBreakdown(cart.items, cleanCode, userId);

    res.status(200).json({
      success: true,
      message: `Coupon "${cleanCode}" applied successfully`,
      data: {
        cartId: cart._id,
        sessionId,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Removes coupon code from the active cart.
 */
export const removeCoupon = async (req, res, next) => {
  try {
    const { cart, userId, sessionId } = await resolveCart(req);

    if (cart) {
      cart.couponCode = null;
      await cart.save();
    }

    const breakdown = cart ? await calculateCartBreakdown(cart.items, null, userId) : null;

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      data: {
        cartId: cart?._id,
        sessionId,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Merges a guest cart into the authenticated customer's cart.
 */
export const mergeGuestCart = async (req, res, next) => {
  try {
    const { guestSessionId } = req.body;
    const userId = req.user.id;

    if (!guestSessionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SESSION_ID_REQUIRED', message: 'guestSessionId is required' },
      });
    }

    const guestCart = await Cart.findOne({ sessionId: guestSessionId });
    let userCart = await Cart.findOne({ userId });

    if (!userCart) {
      userCart = await Cart.create({ userId, items: [] });
    }

    if (guestCart && guestCart.items.length > 0) {
      for (const guestItem of guestCart.items) {
        const existingIdx = userCart.items.findIndex(
          (it) =>
            String(it.productId) === String(guestItem.productId) &&
            it.variantSku === guestItem.variantSku
        );

        if (existingIdx > -1) {
          userCart.items[existingIdx].quantity += guestItem.quantity;
        } else {
          userCart.items.push(guestItem);
        }
      }

      // Preserve coupon if user cart doesn't have one
      if (!userCart.couponCode && guestCart.couponCode) {
        userCart.couponCode = guestCart.couponCode;
      }

      await userCart.save();
      await Cart.deleteOne({ _id: guestCart._id });
    }

    const breakdown = await calculateCartBreakdown(userCart.items, userCart.couponCode, userId);

    res.status(200).json({
      success: true,
      message: 'Guest cart merged successfully',
      data: {
        cartId: userCart._id,
        userId,
        ...breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};
