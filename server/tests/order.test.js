// server/tests/order.test.js
import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { Cart, Category, Product } from '../src/models/index.js';
import { generateTestRazorpaySignature } from '../src/services/payment.service.js';
import { hashPassword } from '../src/utils/password.js';
import { generateAccessToken } from '../src/utils/tokens.js';

describe('Phase 5: Cart, Checkout, Orders, and Payments Test Suite', () => {
  const timestamp = Date.now();
  let testUser1;
  let testToken1;
  let testUser2;
  let testToken2;
  let testAdminUser;
  let testAdminToken;

  let testCategory;
  let testProduct;
  let testSingleStockProduct;
  let testAddress1;
  let testCoupon;

  beforeAll(async () => {
    await connectMongoDB();

    // 1. Create 2 test customers and 1 admin user in MySQL
    const pwdHash = await hashPassword('StrongPassword#2026');

    testUser1 = await prisma.user.create({
      data: {
        name: 'Order Test Customer 1',
        email: `order_cust1_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    testToken1 = generateAccessToken(testUser1);

    testUser2 = await prisma.user.create({
      data: {
        name: 'Order Test Customer 2',
        email: `order_cust2_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    testToken2 = generateAccessToken(testUser2);

    testAdminUser = await prisma.user.create({
      data: {
        name: 'Order Test Admin',
        email: `order_admin_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    testAdminToken = generateAccessToken(testAdminUser);

    // 2. Create test shipping address for customer 1
    testAddress1 = await prisma.address.create({
      data: {
        userId: testUser1.id,
        fullName: 'Customer One',
        phone: '+919876543210',
        addressLine1: 'Flat 402, Sunshine Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        isDefault: true,
      },
    });

    // 3. Create test coupon in MySQL
    testCoupon = await prisma.coupon.create({
      data: {
        code: `ZIPPYTEST_${timestamp}`,
        discountType: 'PERCENTAGE',
        discountValue: 10, // 10%
        minOrderAmount: 100,
        maxDiscountAmount: 50,
        validFrom: new Date(Date.now() - 3600 * 1000),
        validUntil: new Date(Date.now() + 86400 * 1000 * 30),
        isActive: true,
      },
    });

    // 4. Create category and products in MongoDB
    testCategory = await Category.create({
      name: `Order Category ${timestamp}`,
      slug: `order-cat-${timestamp}`,
      image: 'https://images.unsplash.com/test-cat.jpg',
      icon: '🛒',
      displayOrder: 1,
      isActive: true,
    });

    testProduct = await Product.create({
      name: `Test Grocery Item ${timestamp}`,
      slug: `test-grocery-${timestamp}`,
      description: 'Standard grocery item with abundant stock',
      categoryId: testCategory._id,
      categorySlug: testCategory.slug,
      brand: 'Zippy Farm',
      images: [{ url: 'https://images.unsplash.com/item.jpg', isPrimary: true }],
      variants: [
        {
          sku: `SKU-NORM-${timestamp}`,
          unit: '1 kg',
          price: 150,
          mrp: 180,
          stock: 50,
        },
      ],
      primaryPrice: 150,
      primaryMrp: 180,
      totalStock: 50,
      isAvailable: true,
    });

    // Product with exactly 1 unit in stock for the concurrency test
    testSingleStockProduct = await Product.create({
      name: `Last Unit Product ${timestamp}`,
      slug: `last-unit-${timestamp}`,
      description: 'High-demand limited item with exactly 1 unit left',
      categoryId: testCategory._id,
      categorySlug: testCategory.slug,
      brand: 'Rare Goods',
      images: [{ url: 'https://images.unsplash.com/rare.jpg', isPrimary: true }],
      variants: [
        {
          sku: `SKU-RARE-${timestamp}`,
          unit: '500 g',
          price: 250,
          mrp: 300,
          stock: 1, // Exactly 1 unit in stock!
        },
      ],
      primaryPrice: 250,
      primaryMrp: 300,
      totalStock: 1,
      isAvailable: true,
    });
  });

  afterAll(async () => {
    // Cleanup MySQL records
    try {
      await prisma.couponUsage.deleteMany({
        where: { couponId: testCoupon?.id },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { userId: { in: [testUser1.id, testUser2.id] } } },
      });
      await prisma.payment.deleteMany({
        where: { order: { userId: { in: [testUser1.id, testUser2.id] } } },
      });
      await prisma.order.deleteMany({
        where: { userId: { in: [testUser1.id, testUser2.id] } },
      });
      await prisma.address.deleteMany({
        where: { userId: { in: [testUser1.id, testUser2.id] } },
      });
      await prisma.coupon.deleteMany({
        where: { id: testCoupon?.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUser1.id, testUser2.id, testAdminUser.id] } },
      });
    } catch {
      // Ignore cleanup error
    }

    // Cleanup MongoDB records
    try {
      if (testCategory) await Category.deleteOne({ _id: testCategory._id });
      if (testProduct) await Product.deleteOne({ _id: testProduct._id });
      if (testSingleStockProduct) await Product.deleteOne({ _id: testSingleStockProduct._id });
    } catch {
      // Ignore mongo cleanup error
    }

    await disconnectMongoDB();
    await prisma.$disconnect();
  });

  describe('1. Cart Management & Guest Cart Merging', () => {
    const guestSessionId = `sess_test_${timestamp}`;

    it('allows guest to add items and computes pricing correctly', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-session-id', guestSessionId)
        .send({
          productId: String(testProduct._id),
          variantSku: testProduct.variants[0].sku,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.itemCount).toBe(2);
      expect(res.body.data.pricing.subtotal).toBe(300); // 150 * 2
      expect(res.body.data.pricing.deliveryFee).toBe(0); // >= 199 is free
      expect(res.body.data.pricing.totalAmount).toBe(300);
    });

    it('rejects adding quantity exceeding available stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-session-id', guestSessionId)
        .send({
          productId: String(testSingleStockProduct._id),
          variantSku: testSingleStockProduct.variants[0].sku,
          quantity: 10, // Stock is only 1
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('applies a valid coupon to guest cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('x-session-id', guestSessionId)
        .send({
          code: testCoupon.code,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appliedCoupon.code).toBe(testCoupon.code);
      // 10% of 300 = 30
      expect(res.body.data.pricing.discountAmount).toBe(30);
      expect(res.body.data.pricing.totalAmount).toBe(270);
    });

    it('merges guest cart into authenticated customer cart on login', async () => {
      const mergeRes = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          guestSessionId,
        });

      expect(mergeRes.status).toBe(200);
      expect(mergeRes.body.success).toBe(true);
      expect(mergeRes.body.data.userId).toBe(testUser1.id);
      expect(mergeRes.body.data.itemCount).toBe(2);
      expect(mergeRes.body.data.appliedCoupon.code).toBe(testCoupon.code);
    });
  });

  describe('2. Address Management (CRUD)', () => {
    let createdAddressId;

    it('lists addresses for authenticated customer', async () => {
      const res = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(res.body.data.addresses[0].pincode).toBe('400001');
    });

    it('creates a new address and handles isDefault toggle', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          fullName: 'Customer One Office',
          phone: '+919876543210',
          addressLine1: 'Office 101, Tech Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400051',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefault).toBe(true);
      createdAddressId = res.body.data.address.id;

      // Verify previous address is no longer default
      const prevAddr = await prisma.address.findUnique({ where: { id: testAddress1.id } });
      expect(prevAddr.isDefault).toBe(false);
    });

    it('soft deletes address', async () => {
      const res = await request(app)
        .delete(`/api/v1/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${testToken1}`);

      expect(res.status).toBe(200);

      // Verify in DB that deletedAt is populated
      const deletedAddr = await prisma.address.findUnique({ where: { id: createdAddressId } });
      expect(deletedAddr.deletedAt).not.toBeNull();
    });
  });

  describe('3. Public Coupon Listing and Validation', () => {
    it('lists active coupons', async () => {
      const res = await request(app).get('/api/v1/coupons');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('validates coupon against prospective order amount', async () => {
      const res = await request(app).post('/api/v1/coupons/validate').send({
        code: testCoupon.code,
        subtotal: 500,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.coupon.code).toBe(testCoupon.code);
      // 10% of 500 = 50 (maxDiscountAmount is 50)
      expect(res.body.data.coupon.discountAmount).toBe(50);
    });

    it('rejects coupon if subtotal is below minimum order amount', async () => {
      const res = await request(app).post('/api/v1/coupons/validate').send({
        code: testCoupon.code,
        subtotal: 50, // min is 100
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MIN_ORDER_AMOUNT_NOT_MET');
    });
  });

  describe('4. Checkout, Atomic Stock Reservation, and Order Placement (COD & Razorpay)', () => {
    let placedOrderId;
    const idempotencyKey = `idem_${crypto.randomUUID()}`;

    it('places COD order, creates MySQL snapshot, decrements Mongo stock, and clears cart', async () => {
      // Cart already has 2 units of testProduct from section 1 merge
      const initialStock = (await Product.findById(testProduct._id)).variants[0].stock;

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          addressId: testAddress1.id,
          paymentMethod: 'COD',
          idempotencyKey,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{6}$/);
      expect(res.body.data.order.status).toBe('PLACED');
      expect(res.body.data.order.payment.method).toBe('COD');
      expect(res.body.data.order.payment.status).toBe('PENDING');

      placedOrderId = res.body.data.order.id;

      // Verify stock in MongoDB was atomically decremented
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.variants[0].stock).toBe(initialStock - 2);

      // Verify cart in MongoDB was cleared
      const emptyCart = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${testToken1}`);
      expect(emptyCart.body.data.items.length).toBe(0);
    });

    it('enforces idempotency key on duplicate checkout submissions', async () => {
      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          addressId: testAddress1.id,
          paymentMethod: 'COD',
          idempotencyKey, // Same idempotency key!
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(placedOrderId);
    });

    it('places Razorpay order in test/dev mode and returns simulated order identifier', async () => {
      // Add 1 item to customer 1's cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          productId: String(testProduct._id),
          variantSku: testProduct.variants[0].sku,
          quantity: 1,
        });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          addressId: testAddress1.id,
          paymentMethod: 'RAZORPAY',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.payment.method).toBe('RAZORPAY');
      expect(res.body.data.razorpay).toBeDefined();
      expect(res.body.data.razorpay.orderId).toMatch(/^order_/);

      const rzpOrderId = res.body.data.razorpay.orderId;
      const fakePaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
      const fakeSignature = generateTestRazorpaySignature(rzpOrderId, fakePaymentId);

      // Verify Razorpay signature
      const verifyRes = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          orderId: res.body.data.order.id,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: fakePaymentId,
          razorpaySignature: fakeSignature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.paymentStatus).toBe('COMPLETED');
    });
  });

  describe('5. CONCURRENCY TEST: Two Users Competing for the Last Remaining Stock', () => {
    it('guarantees exactly one user succeeds and one user fails with 409 (no overselling)', async () => {
      // Confirm testSingleStockProduct has EXACTLY 1 unit in MongoDB
      const initialStockCheck = await Product.findById(testSingleStockProduct._id);
      expect(initialStockCheck.variants[0].stock).toBe(1);

      // Both Customer 1 and Customer 2 add the 1 remaining unit to their respective carts
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          productId: String(testSingleStockProduct._id),
          variantSku: testSingleStockProduct.variants[0].sku,
          quantity: 1,
        });

      // Customer 2 creates an address first
      const addr2Res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({
          fullName: 'Customer Two',
          phone: '+919123456789',
          addressLine1: 'Building 12, High Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          isDefault: true,
        });

      const cust2AddressId = addr2Res.body.data.address.id;

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({
          productId: String(testSingleStockProduct._id),
          variantSku: testSingleStockProduct.variants[0].sku,
          quantity: 1,
        });

      // DISPATCH SIMULTANEOUS CHECKOUT REQUESTS AT THE EXACT SAME MILLISECOND
      const [responseUser1, responseUser2] = await Promise.all([
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${testToken1}`)
          .send({
            addressId: testAddress1.id,
            paymentMethod: 'COD',
          }),
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${testToken2}`)
          .send({
            addressId: cust2AddressId,
            paymentMethod: 'COD',
          }),
      ]);

      const statusCodes = [responseUser1.status, responseUser2.status].sort();

      // STRICT CONCURRENCY ASSERTIONS:
      // Exactly ONE user must succeed with HTTP 201 Created
      // Exactly ONE user must fail with HTTP 409 Conflict (INSUFFICIENT_STOCK)
      expect(statusCodes).toEqual([201, 409]);

      const successResponse = responseUser1.status === 201 ? responseUser1 : responseUser2;
      const failedResponse = responseUser1.status === 409 ? responseUser1 : responseUser2;

      expect(successResponse.body.success).toBe(true);
      expect(successResponse.body.data.order.status).toBe('PLACED');

      expect(failedResponse.body.success).toBe(false);
      expect(failedResponse.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Verify database inventory: Stock must be exactly 0 (never negative)
      const postCheckoutProduct = await Product.findById(testSingleStockProduct._id);
      expect(postCheckoutProduct.variants[0].stock).toBe(0);
      expect(postCheckoutProduct.totalStock).toBe(0);
    });
  });

  describe('6. Order Cancellation & Stock Restoration', () => {
    it('cancels a placed order and restores MongoDB stock back to inventory', async () => {
      // Clear any prior cart state
      await Cart.deleteOne({ userId: testUser1.id });

      // 1. Add 3 units of testProduct to cart and checkout
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          productId: String(testProduct._id),
          variantSku: testProduct.variants[0].sku,
          quantity: 3,
        });

      const beforeStock = (await Product.findById(testProduct._id)).variants[0].stock;

      const orderRes = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          addressId: testAddress1.id,
          paymentMethod: 'COD',
        });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.data.order.id;
      const afterDeductionStock = (await Product.findById(testProduct._id)).variants[0].stock;
      expect(afterDeductionStock).toBe(beforeStock - 3);

      // 2. Cancel order
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          cancellationReason: 'Found a better offer',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe('CANCELLED');

      // 3. Verify stock restored in MongoDB
      const restoredStock = (await Product.findById(testProduct._id)).variants[0].stock;
      expect(restoredStock).toBe(beforeStock);
    });
  });

  describe('7. Order Status State Machine & Role Protection', () => {
    let orderId;

    beforeAll(async () => {
      // Clear any prior cart state
      await Cart.deleteOne({ userId: testUser1.id });

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          productId: String(testProduct._id),
          variantSku: testProduct.variants[0].sku,
          quantity: 1,
        });

      const res = await request(app)
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          addressId: testAddress1.id,
          paymentMethod: 'COD',
        });

      expect(res.status).toBe(201);
      orderId = res.body.data.order.id;
    });

    it('forbids customers from updating order status directly', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${testToken1}`) // Customer token
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(403);
    });

    it('allows Admin to advance status through valid state machine transitions', async () => {
      // PLACED -> PACKED
      const packedRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({ status: 'PACKED' });
      expect(packedRes.status).toBe(200);
      expect(packedRes.body.data.order.status).toBe('PACKED');

      // PACKED -> OUT_FOR_DELIVERY
      const outRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({ status: 'OUT_FOR_DELIVERY' });
      expect(outRes.status).toBe(200);
      expect(outRes.body.data.order.status).toBe('OUT_FOR_DELIVERY');

      // OUT_FOR_DELIVERY -> DELIVERED
      const deliveredRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({ status: 'DELIVERED' });
      expect(deliveredRes.status).toBe(200);
      expect(deliveredRes.body.data.order.status).toBe('DELIVERED');
    });

    it('rejects invalid state machine transitions', async () => {
      // Order is now DELIVERED (terminal), cannot go back to PLACED
      const invalidRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${testAdminToken}`)
        .send({ status: 'PLACED' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });
});
