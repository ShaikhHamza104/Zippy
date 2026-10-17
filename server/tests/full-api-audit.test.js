// server/tests/full-api-audit.test.js
import crypto from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { Banner, Cart, Category, Product } from '../src/models/index.js';
import { generateTestRazorpaySignature } from '../src/services/payment.service.js';
import { hashPassword } from '../src/utils/password.js';
import { generateAccessToken } from '../src/utils/tokens.js';

describe('Phase 14: Exhaustive 60+ API Endpoint & Security Verification Suite', () => {
  const timestamp = Date.now();
  let customerUser;
  let customerToken;
  let adminUser;
  let adminToken;
  let superAdminUser;
  let superAdminToken;

  let testCategory;
  let testProduct;
  let testVariantSku;
  let testRaceProduct;
  let testAddress;
  let testCoupon;
  let testBanner;
  let samplePngBuffer;

  beforeAll(async () => {
    await connectMongoDB();

    // 1. Generate PNG buffer for admin upload tests
    samplePngBuffer = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: { r: 16, g: 185, b: 129 },
      },
    })
      .png()
      .toBuffer();

    const pwdHash = await hashPassword('P@ssword#2026!');

    // 2. Setup Customer in MySQL
    customerUser = await prisma.user.create({
      data: {
        name: 'Audit Customer',
        email: `audit_cust_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        phone: `+9198${String(timestamp).slice(-8)}`,
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    customerToken = generateAccessToken(customerUser);

    // 3. Setup Admin in MySQL
    adminUser = await prisma.user.create({
      data: {
        name: 'Audit Admin',
        email: `audit_admin_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        phone: `+9193${String(timestamp).slice(-8)}`,
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    adminToken = generateAccessToken(adminUser);

    // 4. Use Canonical Super Admin in MySQL
    superAdminUser = await prisma.user.findUnique({
      where: { email: 'admin@zippy.com' },
    });
    superAdminToken = generateAccessToken(superAdminUser);

    // 5. Setup Category in MongoDB
    testCategory = await Category.create({
      name: `Audit Category ${timestamp}`,
      slug: `audit-cat-${timestamp}`,
      icon: '🥛',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
      description: 'Audit test category for full verification',
      displayOrder: 1,
      isActive: true,
    });

    // 6. Setup Standard Product in MongoDB
    testProduct = await Product.create({
      name: `Audit Organic Cow Milk ${timestamp}`,
      slug: `audit-milk-${timestamp}`,
      categoryId: testCategory._id,
      categorySlug: testCategory.slug,
      brand: 'Zippy Farm Fresh',
      description: 'Pasteurized homogenized pure cow milk',
      images: [
        { url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150', isPrimary: true },
      ],
      isAvailable: true,
      displayOrder: 1,
      variants: [
        {
          sku: `AUDIT-MILK-1L-${timestamp}`,
          unit: '1L',
          price: 60,
          mrp: 75,
          stock: 100,
          isDefault: true,
        },
      ],
      primaryPrice: 60,
      primaryMrp: 75,
      totalStock: 100,
    });
    testVariantSku = testProduct.variants[0].sku;

    // 7. Setup Race Product with exactly 1 unit of stock for concurrency assertion
    testRaceProduct = await Product.create({
      name: `Audit Rare Golden Apple ${timestamp}`,
      slug: `audit-golden-apple-${timestamp}`,
      categoryId: testCategory._id,
      categorySlug: testCategory.slug,
      brand: 'Exclusive Orchards',
      description: 'Only 1 unit remaining in stock globally',
      images: [
        { url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6', isPrimary: true },
      ],
      isAvailable: true,
      variants: [
        {
          sku: `AUDIT-RACE-1U-${timestamp}`,
          unit: '1 pc',
          price: 150,
          mrp: 200,
          stock: 1, // EXACTLY 1 REMAINING
          isDefault: true,
        },
      ],
      primaryPrice: 150,
      primaryMrp: 200,
      totalStock: 1,
    });

    // 8. Setup Customer Address in MySQL
    testAddress = await prisma.address.create({
      data: {
        userId: customerUser.id,
        fullName: 'Audit Customer',
        phone: '+919876540001',
        addressLine1: 'Flat 101, Audit Towers, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        isDefault: true,
      },
    });

    // 9. Setup Coupon in MySQL
    testCoupon = await prisma.coupon.create({
      data: {
        code: `AUDIT${timestamp}`.toUpperCase().substring(0, 15),
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderAmount: 50,
        maxDiscountAmount: 100,
        usageLimit: 500,
        validFrom: new Date(Date.now() - 60000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    // 10. Setup Banner in MongoDB
    testBanner = await Banner.create({
      title: `Audit Campaign ${timestamp}`,
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      linkUrl: `/categories/${testCategory.slug}`,
      badgeText: 'AUDIT DEAL',
      displayOrder: 1,
      isActive: true,
    });
  });

  afterAll(async () => {
    // Cleanup MongoDB documents created for this test
    if (testCategory) await Category.deleteOne({ _id: testCategory._id });
    await Category.deleteMany({
      $or: [
        { name: { $regex: /^Bakery Admin/i } },
        { slug: { $regex: /^bakery-admin/i } },
        { name: { $regex: /^Audit Category/i } },
      ],
    });
    if (testProduct) await Product.deleteOne({ _id: testProduct._id });
    if (testRaceProduct) await Product.deleteOne({ _id: testRaceProduct._id });
    await Product.deleteMany({
      name: {
        $regex:
          /^(Admin Test Product|Dedicated Race Product|E2E Organic Alphonso Mangoes|Audit Product)/i,
      },
    });
    if (testBanner) await Banner.deleteOne({ _id: testBanner._id });

    // Cleanup MySQL records
    try {
      await prisma.orderItem.deleteMany({
        where: { order: { userId: customerUser.id } },
      });
      await prisma.payment.deleteMany({
        where: { order: { userId: customerUser.id } },
      });
      await prisma.couponUsage.deleteMany({
        where: { userId: customerUser.id },
      });
      await prisma.order.deleteMany({
        where: { userId: customerUser.id },
      });
      await prisma.address.deleteMany({
        where: { userId: customerUser.id },
      });
      await prisma.coupon.deleteMany({
        where: { id: testCoupon.id },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: [customerUser.id, adminUser.id] } },
      });
      await prisma.session.deleteMany({
        where: { userId: { in: [customerUser.id, adminUser.id] } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: adminUser.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [customerUser.id, adminUser.id] } },
      });
    } catch {
      // ignore cleanup errors on cascade
    }

    await disconnectMongoDB();
  });

  /* =========================================================================
     GROUP 1: HEALTH, READINESS & ROOT DIAGNOSTICS
     ========================================================================= */
  describe('Group 1: Health, Readiness & Root Diagnostics', () => {
    it('GET /health returns 200 and liveness probe status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    it('GET /ready returns 200 and readiness status', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toHaveProperty('server', 'ok');
    });

    it('GET /api/v1 returns 200 and API version metadata', async () => {
      const res = await request(app).get('/api/v1');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  /* =========================================================================
     GROUP 2: AUTHENTICATION, PROFILE & SESSION LIFECYCLE
     ========================================================================= */
  describe('Group 2: Authentication, Profile & Session Lifecycle', () => {
    const authEmail = `flow_auth_${timestamp}@zippy.test`;
    let flowToken = '';

    it('POST /api/v1/auth/register registers a new user with httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Flow User',
          email: authEmail,
          password: 'FlowPassword#2026',
          phone: `+9197${String(timestamp).slice(-8)}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(authEmail);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('zippy_refresh='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('POST /api/v1/auth/login signs in and returns accessToken', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: authEmail,
        password: 'FlowPassword#2026',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      flowToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('zippy_refresh='));
      expect(refreshCookie).toBeDefined();
    });

    it('GET /api/v1/auth/me returns current user identity', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${flowToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(authEmail);
    });

    it('POST /api/v1/auth/forgot-password triggers password recovery dispatch', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: authEmail,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/change-password updates user password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${flowToken}`)
        .send({
          currentPassword: 'FlowPassword#2026',
          newPassword: 'NewFlowPassword#2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/refresh rotates refresh token with CSRF header', async () => {
      // Log in again with new password to get fresh refresh token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: authEmail,
        password: 'NewFlowPassword#2026',
      });
      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('zippy_refresh='));

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshCookie])
        .set('X-Zippy-Client', 'web');

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('POST /api/v1/auth/logout revokes session and clears cookie', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: authEmail,
        password: 'NewFlowPassword#2026',
      });
      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('zippy_refresh='));

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [refreshCookie])
        .set('X-Zippy-Client', 'web');

      expect(res.status).toBe(200);
      const setCookies = res.headers['set-cookie'];
      expect(setCookies.some((c) => c.includes('zippy_refresh=;'))).toBe(true);
    });

    it('POST /api/v1/auth/create-admin allows SUPER_ADMIN to provision new admin account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/create-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Delegated Admin',
          email: `delegated_admin_${timestamp}@zippy.test`,
          password: 'AdminPassword#2026!',
          phone: `+9192${String(timestamp).slice(-8)}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('ADMIN');
    });
  });

  /* =========================================================================
     GROUP 3: STOREFRONT CATALOG, SEARCH & HOME FEED
     ========================================================================= */
  describe('Group 3: Storefront Catalog, Search & Home Feed', () => {
    it('GET /api/v1/categories returns public active categories', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.some((c) => c.slug === testCategory.slug)).toBe(true);
    });

    it('GET /api/v1/categories/:slug returns single category with products', async () => {
      const res = await request(app).get(`/api/v1/categories/${testCategory.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.category.slug).toBe(testCategory.slug);
    });

    it('GET /api/v1/products returns paginated catalog', async () => {
      const res = await request(app).get('/api/v1/products?limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/v1/products/:slug returns product detail with variants', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.product.slug).toBe(testProduct.slug);
      expect(res.body.data.product.variants.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/home returns homepage aggregated feed with banners and categories', async () => {
      const res = await request(app).get('/api/v1/home');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('banners');
      expect(res.body.data).toHaveProperty('categories');
    });

    it('GET /api/v1/search returns search results for query', async () => {
      const res = await request(app).get('/api/v1/search?q=Organic');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });

    it('GET /api/v1/search/suggestions returns autocomplete suggestions', async () => {
      const res = await request(app).get('/api/v1/search/suggestions?q=Mil');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
    });
  });

  /* =========================================================================
     GROUP 4: DELIVERY & SERVICEABILITY
     ========================================================================= */
  describe('Group 4: Delivery & Serviceability', () => {
    it('GET /api/v1/serviceability/560001 returns serviceable status for valid pincode', async () => {
      const res = await request(app).get('/api/v1/serviceability/560001');
      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(true);
      expect(res.body.data.hubName).toBeDefined();
      expect(res.body.data.estimatedDeliveryMinutes).toBeDefined();
    });

    it('GET /api/v1/serviceability?pincode=560001 checks query-based serviceability', async () => {
      const res = await request(app).get('/api/v1/serviceability?pincode=560001');
      expect(res.status).toBe(200);
      expect(res.body.data.serviceable).toBe(true);
    });
  });

  /* =========================================================================
     GROUP 5: GUEST CART, ITEM MUTATIONS & GUEST-TO-USER MERGE
     ========================================================================= */
  describe('Group 5: Guest Cart, Item Mutations & Guest-to-User Merge', () => {
    const guestSessionId = `guest_session_${timestamp}`;

    it('GET /api/v1/cart creates/returns empty guest cart', async () => {
      const res = await request(app).get('/api/v1/cart').set('x-session-id', guestSessionId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items).toEqual([]);
    });

    it('POST /api/v1/cart/items adds an item to guest cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-session-id', guestSessionId)
        .send({
          productId: testProduct._id.toString(),
          variantSku: testVariantSku,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].quantity).toBe(2);
    });

    it('PUT /api/v1/cart/items/:sku updates item quantity', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${testVariantSku}`)
        .set('x-session-id', guestSessionId)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(3);
    });

    it('POST /api/v1/cart/merge merges guest cart into customer cart upon login', async () => {
      const res = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ guestSessionId });

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /api/v1/cart clears cart items', async () => {
      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });
  });

  /* =========================================================================
     GROUP 6: PROMOTIONS & COUPONS
     ========================================================================= */
  describe('Group 6: Promotions & Coupons', () => {
    beforeAll(async () => {
      // Put items in customer cart to satisfy minimum order amount (min 50)
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id.toString(),
          variantSku: testVariantSku,
          quantity: 2, // 2 * 60 = 120
        });
    });

    it('GET /api/v1/coupons returns list of active public coupons', async () => {
      const res = await request(app).get('/api/v1/coupons');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.coupons)).toBe(true);
      expect(res.body.data.coupons.some((c) => c.code === testCoupon.code)).toBe(true);
    });

    it('POST /api/v1/coupons/validate checks coupon validity and discount against subtotal', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          code: testCoupon.code,
          subtotal: 120,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.coupon.discountAmount).toBeGreaterThan(0);
    });

    it('POST /api/v1/cart/coupon applies valid coupon code to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: testCoupon.code });

      expect(res.status).toBe(200);
      expect(res.body.data.pricing.discountAmount).toBeGreaterThan(0);
      expect(res.body.data.appliedCoupon.code).toBe(testCoupon.code);
    });

    it('DELETE /api/v1/cart/coupon removes coupon from cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appliedCoupon).toBeNull();
    });
  });

  /* =========================================================================
     GROUP 7: ADDRESSES CRUD
     ========================================================================= */
  describe('Group 7: Addresses CRUD', () => {
    let createdAddressId = '';

    it('GET /api/v1/addresses returns user address book', async () => {
      const res = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.addresses)).toBe(true);
      expect(res.body.data.addresses.some((a) => a.id === testAddress.id)).toBe(true);
    });

    it('POST /api/v1/addresses creates a new delivery address', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Audit Office',
          phone: '+919876540002',
          addressLine1: 'Level 4, Tech Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          isDefault: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.fullName).toBe('Audit Office');
      createdAddressId = res.body.data.address.id;
    });

    it('PUT /api/v1/addresses/:id updates an existing address', async () => {
      const res = await request(app)
        .put(`/api/v1/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressLine1: 'Level 5, Executive Tower',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.address.addressLine1).toBe('Level 5, Executive Tower');
    });

    it('PATCH /api/v1/addresses/:id/default sets address as default', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${createdAddressId}/default`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.address.isDefault).toBe(true);
    });

    it('DELETE /api/v1/addresses/:id removes address from user profile', async () => {
      const res = await request(app)
        .delete(`/api/v1/addresses/${createdAddressId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* =========================================================================
     GROUP 8: CHECKOUT PREVIEW, CONCURRENCY RACE & ORDER LIFECYCLE
     ========================================================================= */
  describe('Group 8: Checkout Preview, Concurrency Race & Order Lifecycle', () => {
    let placedOrderId = '';
    let isolatedRaceProduct;
    let competitorUser;
    let competitorToken;
    let competitorAddress;
    let winningToken = '';

    it('GET /api/v1/cart recomputes prices, taxes, and delivery fees for checkout readiness', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pricing).toHaveProperty('subtotal');
      expect(res.body.data.pricing).toHaveProperty('deliveryFee');
      expect(res.body.data.pricing).toHaveProperty('totalAmount');
    });

    it('CONCURRENCY RACE: 2 concurrent checkouts on last 1 stock item -> exactly 1 succeeds, 1 fails', async () => {
      // 1. Create a dedicated fresh product with EXACTLY 1 unit of stock
      isolatedRaceProduct = await Product.create({
        name: `Dedicated Race Product ${Date.now()}`,
        slug: `dedicated-race-${Date.now()}`,
        categoryId: testCategory._id,
        categorySlug: testCategory.slug,
        brand: 'Race Orchards',
        description: 'Single unit concurrency item',
        images: [
          { url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6', isPrimary: true },
        ],
        isAvailable: true,
        variants: [
          {
            sku: `RACE-SINGLE-${Date.now()}`,
            unit: '1 unit',
            price: 200,
            mrp: 250,
            stock: 1, // EXACTLY 1 REMAINING
            isDefault: true,
          },
        ],
        primaryPrice: 200,
        primaryMrp: 250,
        totalStock: 1,
      });
      const raceSku = isolatedRaceProduct.variants[0].sku;

      // 2. Setup Competitor customer
      const pwdHash = await hashPassword('RacePassword#2026');
      competitorUser = await prisma.user.create({
        data: {
          name: 'Race Competitor',
          email: `race_competitor_${Date.now()}@zippy.test`,
          passwordHash: pwdHash,
          phone: `+9195${String(Date.now()).slice(-8)}`,
          role: 'CUSTOMER',
          emailVerified: true,
        },
      });
      competitorToken = generateAccessToken(competitorUser);
      competitorAddress = await prisma.address.create({
        data: {
          userId: competitorUser.id,
          fullName: 'Competitor User',
          phone: '+919876540099',
          addressLine1: 'Flat 99, Speed Run Street',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
      });

      // 3. Clear existing carts completely in DB
      await Cart.deleteOne({ userId: customerUser.id });
      await Cart.deleteOne({ userId: competitorUser.id });

      // 4. Add the 1 remaining item into both user carts
      const add1 = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: isolatedRaceProduct._id.toString(),
          variantSku: raceSku,
          quantity: 1,
        });
      expect(add1.status).toBe(200);

      const add2 = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${competitorToken}`)
        .send({
          productId: isolatedRaceProduct._id.toString(),
          variantSku: raceSku,
          quantity: 1,
        });
      expect(add2.status).toBe(200);

      // 5. Fire simultaneous checkouts using Promise.all
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            addressId: testAddress.id,
            paymentMethod: 'COD',
          }),
        request(app)
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${competitorToken}`)
          .send({
            addressId: competitorAddress.id,
            paymentMethod: 'COD',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);

      // Track the successful order ID and winning token
      const successfulRes = res1.status === 201 ? res1 : res2;
      const failedRes = res1.status === 409 ? res1 : res2;
      expect(successfulRes.body.success).toBe(true);
      expect(failedRes.body.success).toBe(false);
      expect(failedRes.body.error.code).toBe('INSUFFICIENT_STOCK');

      placedOrderId = successfulRes.body.data.order.id;
      winningToken = res1.status === 201 ? customerToken : competitorToken;

      // 6. Verify MongoDB stock is exactly 0 and never negative
      const updatedRaceProduct = await Product.findById(isolatedRaceProduct._id);
      expect(updatedRaceProduct.variants[0].stock).toBe(0);
    });

    it('GET /api/v1/orders returns customer order history', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${winningToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/orders/:id returns order details with item snapshots', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${placedOrderId}`)
        .set('Authorization', `Bearer ${winningToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(placedOrderId);
      expect(res.body.data.order.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.order.deliveryAddress).toBeDefined();
    });

    it('POST /api/v1/orders/:id/cancel cancels order and restores inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${placedOrderId}/cancel`)
        .set('Authorization', `Bearer ${winningToken}`)
        .send({ cancellationReason: 'Accidental order placement' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('CANCELLED');

      // Verify compensating transaction restored the stock back to 1
      const restoredProduct = await Product.findById(isolatedRaceProduct._id);
      expect(restoredProduct.variants[0].stock).toBe(1);

      // Cleanup isolated race resources
      if (isolatedRaceProduct) await Product.deleteOne({ _id: isolatedRaceProduct._id });
      if (competitorUser) {
        try {
          await prisma.orderItem.deleteMany({ where: { order: { userId: competitorUser.id } } });
          await prisma.payment.deleteMany({ where: { order: { userId: competitorUser.id } } });
          await prisma.order.deleteMany({ where: { userId: competitorUser.id } });
          await prisma.address.deleteMany({ where: { userId: competitorUser.id } });
          await prisma.user.delete({ where: { id: competitorUser.id } });
        } catch {
          // ignore
        }
      }
    });
  });

  /* =========================================================================
     GROUP 9: PAYMENTS & RAZORPAY WEBHOOKS
     ========================================================================= */
  describe('Group 9: Payments & Razorpay Webhooks', () => {
    let dummyOrder;

    beforeAll(async () => {
      // Setup order with payment in MySQL
      dummyOrder = await prisma.order.create({
        data: {
          userId: customerUser.id,
          orderNumber: `ORD-PAY-${Date.now()}`,
          subtotal: 100,
          deliveryFee: 15,
          totalAmount: 115,
          status: 'PLACED',
          deliveryAddress: {
            fullName: 'Audit Customer',
            phone: '+919876540001',
            addressLine1: 'Test St',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
          },
          payment: {
            create: {
              amount: 115,
              method: 'RAZORPAY',
              status: 'PENDING',
              razorpayOrderId: `order_sim_${Date.now()}`,
            },
          },
        },
        include: { payment: true },
      });
    });

    it('POST /api/v1/payments/verify verifies Razorpay HMAC signature', async () => {
      const razorpayPaymentId = `pay_sim_${Date.now()}`;
      const signature = generateTestRazorpaySignature(
        dummyOrder.payment.razorpayOrderId,
        razorpayPaymentId
      );

      const res = await request(app)
        .post('/api/v1/payments/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: dummyOrder.id,
          razorpayOrderId: dummyOrder.payment.razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('COMPLETED');
    });

    it('POST /api/v1/payments/webhook processes payment.captured webhook payload', async () => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
      const eventPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_hook_${Date.now()}`,
              order_id: dummyOrder.payment.razorpayOrderId,
              amount: 11500,
              status: 'captured',
            },
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', signature)
        .send(eventPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  /* =========================================================================
     GROUP 10: ADMIN BACKOFFICE ALL CRUD & AUDIT TRAILS
     ========================================================================= */
  describe('Group 10: Admin Backoffice All CRUD & Audit Trails', () => {
    let adminCreatedCatId = '';
    let adminCreatedProductId = '';
    let adminCreatedCouponId = '';
    let adminCreatedBannerId = '';

    // 10.1 Dashboard Stats
    it('GET /api/v1/admin/dashboard returns operational KPI metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toHaveProperty('ordersToday');
      expect(res.body.data.stats).toHaveProperty('totalRevenue');
      expect(res.body.data.stats).toHaveProperty('activeCustomers');
      expect(res.body.data).toHaveProperty('lowStockAlerts');
    });

    // 10.2 Product CRUD & Stock update
    it('POST /api/v1/admin/products creates catalog product with variants', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Admin Test Product ${timestamp}`,
          categoryId: testCategory._id.toString(),
          brand: 'Admin Farms',
          description: 'Product created by admin test suite',
          images: [
            { url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150', isPrimary: true },
          ],
          variants: [
            {
              sku: `ADM-PROD-${timestamp}`,
              unit: '500g',
              price: 45,
              mrp: 60,
              stock: 25,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product).toBeDefined();
      adminCreatedProductId = res.body.data.product._id;
    });

    it('GET /api/v1/admin/products returns paginated inventory items', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });

    it('GET /api/v1/admin/products/:id returns specific product', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/products/${adminCreatedProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product._id).toBe(adminCreatedProductId);
    });

    it('PUT /api/v1/admin/products/:id updates product metadata', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${adminCreatedProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Admin Test Product Updated ${timestamp}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toContain('Updated');
    });

    it('PATCH /api/v1/admin/products/:id/stock updates variant inventory count', async () => {
      const prod = await Product.findById(adminCreatedProductId);

      const res = await request(app)
        .patch(`/api/v1/admin/products/${adminCreatedProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: prod.variants[0].sku,
          stock: 99,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stock).toBe(99);
    });

    it('DELETE /api/v1/admin/products/:id toggles product availability', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/products/${adminCreatedProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.isAvailable).toBe(false);
    });

    // 10.3 Category CRUD
    it('POST /api/v1/admin/categories creates category', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Bakery Admin ${timestamp}`,
          icon: '🍞',
          image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
          description: 'Fresh artisan breads',
          displayOrder: 2,
        });

      expect(res.status).toBe(201);
      adminCreatedCatId = res.body.data.category._id;
    });

    it('GET /api/v1/admin/categories lists backoffice categories', async () => {
      const res = await request(app)
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
    });

    it('PUT /api/v1/admin/categories/:id updates category', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/categories/${adminCreatedCatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Artisan sourdough & organic multigrain',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toContain('sourdough');
    });

    it('DELETE /api/v1/admin/categories/:id toggles active state', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${adminCreatedCatId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.category.isActive).toBe(false);
    });

    // 10.4 Orders Management
    it('GET /api/v1/admin/orders lists customer orders with status filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    // 10.5 Customers Management
    it('GET /api/v1/admin/customers lists customer accounts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.customers)).toBe(true);
    });

    it('GET /api/v1/admin/customers/:id returns single customer with orders', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${customerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.id).toBe(customerUser.id);
    });

    it('PATCH /api/v1/admin/customers/:id/block blocks customer account', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isBlocked: true,
          reason: 'Automated test verification block',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isBlocked).toBe(true);

      // Unblock to restore
      await request(app)
        .patch(`/api/v1/admin/customers/${customerUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBlocked: false });
    });

    // 10.6 Coupons Management
    it('POST /api/v1/admin/coupons creates promo discount', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `ADM${timestamp}`.substring(0, 15).toUpperCase(),
          discountType: 'FLAT',
          discountValue: 30,
          minOrderAmount: 100,
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(201);
      adminCreatedCouponId = res.body.data.coupon.id;
    });

    it('GET /api/v1/admin/coupons lists coupons', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.coupons)).toBe(true);
    });

    it('PUT /api/v1/admin/coupons/:id updates coupon', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/coupons/${adminCreatedCouponId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 40 });

      expect(res.status).toBe(200);
      expect(Number(res.body.data.coupon.discountValue)).toBe(40);
    });

    it('DELETE /api/v1/admin/coupons/:id deletes coupon', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/coupons/${adminCreatedCouponId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    // 10.7 Banners Management
    it('POST /api/v1/admin/banners creates promotional banner', async () => {
      const res = await request(app)
        .post('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Admin Summer Sale ${timestamp}`,
          imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
          linkUrl: '/products',
          badgeText: 'HOT DEAL',
          displayOrder: 5,
        });

      expect(res.status).toBe(201);
      adminCreatedBannerId = res.body.data.banner._id;
    });

    it('GET /api/v1/admin/banners lists banners', async () => {
      const res = await request(app)
        .get('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.banners)).toBe(true);
    });

    it('PUT /api/v1/admin/banners/:id updates banner', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/banners/${adminCreatedBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ badgeText: 'MEGA DEAL' });

      expect(res.status).toBe(200);
      expect(res.body.data.banner.badgeText).toBe('MEGA DEAL');
    });

    it('DELETE /api/v1/admin/banners/:id deletes banner', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/banners/${adminCreatedBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    // 10.8 Audit Logs & Login Logs
    it('GET /api/v1/admin/audit-logs returns administrative audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.auditLogs)).toBe(true);
    });

    it('GET /api/v1/admin/login-logs returns authentication security logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/login-logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.loginLogs)).toBe(true);
    });

    // 10.9 Image Upload API (Valid WebP/PNG and Invalid MIME rejection)
    it('POST /api/v1/admin/upload saves valid image and returns URL', async () => {
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', samplePngBuffer, 'audit-test.png');

      expect(res.status).toBe(201);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.url).toMatch(/\.(webp|png|jpg|jpeg)$/);
    });

    it('POST /api/v1/admin/upload rejects invalid MIME types (e.g. text/plain)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('malicious script or text'), 'hack.txt');

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.error).toMatch(/invalid file type/i);
    });
  });
});
