// server/tests/admin.test.js
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { Banner, Category, Product } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
import { generateAccessToken } from '../src/utils/tokens.js';

describe('Phase 6: Admin APIs & Backoffice Test Suite', () => {
  const timestamp = Date.now();
  let superAdminUser;
  let superAdminToken;
  let adminUser;
  let adminToken;
  let customerUser;
  let customerToken;

  let testCategory;
  let testProduct;
  let testOrder;
  let samplePngBuffer;

  beforeAll(async () => {
    await connectMongoDB();

    // 1. Setup sample PNG image buffer for upload tests
    samplePngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const pwdHash = await hashPassword('AdminSecure#2026');

    // 2. Setup Super Admin
    superAdminUser = await prisma.user.create({
      data: {
        email: `super_admin_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        name: 'Super Admin User',
        role: 'SUPER_ADMIN',
        emailVerified: true,
      },
    });
    superAdminToken = generateAccessToken(superAdminUser);

    // 3. Setup Admin
    adminUser = await prisma.user.create({
      data: {
        email: `ops_admin_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        name: 'Operations Admin',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    adminToken = generateAccessToken(adminUser);

    // 4. Setup Customer
    customerUser = await prisma.user.create({
      data: {
        email: `regular_customer_${timestamp}@zippy.test`,
        passwordHash: pwdHash,
        name: 'Regular Customer',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    customerToken = generateAccessToken(customerUser);

    // 5. Seed test Category
    testCategory = new Category({
      name: `Admin Test Category ${timestamp}`,
      slug: `admin-test-cat-${timestamp}`,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      description: 'Test category for admin operations',
      displayOrder: 99,
      isActive: true,
    });
    await testCategory.save();

    // 6. Seed test Product
    testProduct = new Product({
      name: `Admin Test Product ${timestamp}`,
      slug: `admin-test-product-${timestamp}`,
      description: 'High quality test product for administrative CRUD testing',
      categoryId: testCategory._id,
      categorySlug: testCategory.slug,
      brand: 'Admin Farms',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
          alt: 'Product front',
          isPrimary: true,
        },
      ],
      variants: [
        {
          unit: '500g',
          price: 120,
          mrp: 150,
          stock: 4, // Intentionally <= 10 for low-stock dashboard test
          sku: `ADM-PROD-${timestamp}-500G`,
        },
        {
          unit: '1kg',
          price: 220,
          mrp: 280,
          stock: 25,
          sku: `ADM-PROD-${timestamp}-1KG`,
        },
      ],
      tags: ['organic', 'admin-test'],
      isAvailable: true,
    });
    await testProduct.save();

    // 7. Seed test Order in MySQL
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-ADM-${timestamp}`,
        userId: customerUser.id,
        status: 'PLACED',
        subtotal: 120.0,
        discountAmount: 0.0,
        deliveryFee: 15.0,
        totalAmount: 135.0,
        deliveryAddress: {
          fullName: customerUser.name,
          phone: '+919876543210',
          city: 'Bengaluru',
          pincode: '560001',
        },
        items: {
          create: [
            {
              mongoProductId: String(testProduct._id),
              nameSnapshot: `${testProduct.name} [${testProduct.variants[0].sku}]`,
              priceSnapshot: 120.0,
              quantity: 2,
              totalPrice: 240.0,
            },
          ],
        },
        payment: {
          create: {
            amount: 135.0,
            method: 'COD',
            status: 'PENDING',
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up MySQL records
    if (testOrder?.id) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.payment.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.order.deleteMany({ where: { id: testOrder.id } });
    }

    const testUserIds = [superAdminUser?.id, adminUser?.id, customerUser?.id].filter(Boolean);
    if (testUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.loginLog.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }

    // Clean up Mongo records
    if (testProduct?._id) await Product.findByIdAndDelete(testProduct._id);
    if (testCategory?._id) await Category.findByIdAndDelete(testCategory._id);
    await Banner.deleteMany({ title: { $regex: 'Admin Test' } });

    await disconnectMongoDB();
  });

  /* ------------------------------------------------------------------------
     1. SECURITY & RBAC ENFORCEMENT
     ------------------------------------------------------------------------ */
  describe('1. Security & RBAC Enforcement', () => {
    it('forbids unauthenticated access to admin dashboard (401)', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('forbids standard CUSTOMER role from accessing admin endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows ADMIN role to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows SUPER_ADMIN role to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  /* ------------------------------------------------------------------------
     2. DASHBOARD OVERVIEW & LOW-STOCK ALERTS
     ------------------------------------------------------------------------ */
  describe('2. Dashboard Overview & Low-Stock Alerts', () => {
    it('returns orders today, revenues, customer counts, and low-stock alerts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toHaveProperty('ordersToday');
      expect(res.body.data.stats).toHaveProperty('totalRevenue');
      expect(res.body.data.stats).toHaveProperty('activeCustomers');
      expect(res.body.data.stats).toHaveProperty('orderStatusBreakdown');
      expect(res.body.data.stats.orderStatusBreakdown).toHaveProperty('PLACED');

      // Check low stock alert from testProduct (variant stock is 4)
      expect(Array.isArray(res.body.data.lowStockAlerts)).toBe(true);
      const matchingAlert = res.body.data.lowStockAlerts.find(
        (a) => a.sku === testProduct.variants[0].sku
      );
      expect(matchingAlert).toBeDefined();
      expect(matchingAlert.stock).toBe(4);
    });
  });

  /* ------------------------------------------------------------------------
     3. PRODUCT MANAGEMENT & INVENTORY ADJUSTMENT
     ------------------------------------------------------------------------ */
  describe('3. Product Management & Inventory Adjustment', () => {
    let createdProductId;

    it('creates a new product, saves to MongoDB, and records audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Fresh Alphonso Mangoes ${timestamp}`,
          description: 'Sweet and aromatic Ratnagiri Alphonso mangoes.',
          categoryId: String(testCategory._id),
          brand: 'Royal Farms',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1553279768-865429fa0078',
              alt: 'Mango Box',
              isPrimary: true,
            },
          ],
          variants: [
            {
              unit: '1 Dozen',
              price: 799,
              mrp: 999,
              stock: 30,
              sku: `MANGO-ALPH-${timestamp}`,
            },
          ],
          tags: ['fruit', 'seasonal'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toContain('Fresh Alphonso Mangoes');
      expect(res.body.data.product.totalStock).toBe(30);

      createdProductId = res.body.data.product._id;

      // Verify audit log entry
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'CREATE_PRODUCT', entityId: String(createdProductId) },
      });
      expect(audit).toBeDefined();
    });

    it('lists products with admin pagination and search filter', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/products?search=Mangoes&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products[0].name).toContain('Mangoes');
    });

    it('updates product details and recalculates variant pricing', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brand: 'Premium Royal Farms',
          description: 'Export quality handpicked Ratnagiri Alphonso mangoes.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.brand).toBe('Premium Royal Farms');
    });

    it('explicitly adjusts inventory stock via PATCH /stock and records audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${createdProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: `MANGO-ALPH-${timestamp}`,
          stock: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stock).toBe(45);
      expect(res.body.data.totalStock).toBe(45);

      const dbProduct = await Product.findById(createdProductId);
      expect(dbProduct.variants[0].stock).toBe(45);
      expect(dbProduct.totalStock).toBe(45);

      const stockAudit = await prisma.auditLog.findFirst({
        where: { action: 'UPDATE_STOCK', entityId: String(createdProductId) },
        orderBy: { createdAt: 'desc' },
      });
      expect(stockAudit).toBeDefined();
      expect(stockAudit.details).toContain('45');
    });

    it('soft deactivates a product on DELETE /products/:id', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.isAvailable).toBe(false);

      const dbProduct = await Product.findById(createdProductId);
      expect(dbProduct.isAvailable).toBe(false);

      // Clean up test mango product
      await Product.findByIdAndDelete(createdProductId);
    });
  });

  /* ------------------------------------------------------------------------
     4. CATEGORY MANAGEMENT
     ------------------------------------------------------------------------ */
  describe('4. Category Management', () => {
    let createdCatId;

    it('creates, updates, and soft-deactivates a category', async () => {
      // Create
      const createRes = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Beverages & Juices ${timestamp}`,
          image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd',
          description: 'Cold drinks and fresh fruit juices',
          icon: '🧃',
          displayOrder: 15,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.category.name).toContain('Beverages & Juices');
      createdCatId = createRes.body.data.category._id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/admin/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Chilled soft drinks, iced teas, and juices',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.category.description).toContain('Chilled soft drinks');

      // Soft delete
      const delRes = await request(app)
        .delete(`/api/v1/admin/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.category.isActive).toBe(false);

      // Clean up
      await Category.findByIdAndDelete(createdCatId);
    });
  });

  /* ------------------------------------------------------------------------
     5. SECURE IMAGE UPLOAD & SHARP PROCESSING
     ------------------------------------------------------------------------ */
  describe('5. Secure Image Upload & Sharp Processing', () => {
    it('uploads a valid PNG buffer, resizes and converts to WebP, and records audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', samplePngBuffer, 'product-sample.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toMatch(/^\/uploads\/img_.*\.webp$/);
      expect(res.body.data.mimeType).toBe('image/webp');
      expect(res.body.data.width).toBe(100);
      expect(res.body.data.height).toBe(100);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'UPLOAD_IMAGE', entityId: res.body.data.filename },
      });
      expect(audit).toBeDefined();
    });

    it('rejects unsupported file formats like text or executable files', async () => {
      const fakeTextBuffer = Buffer.from('This is not an image file');
      const res = await request(app)
        .post('/api/v1/admin/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', fakeTextBuffer, 'notes.txt');

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------------------------------------------------------
     6. ORDER MANAGEMENT & ADMIN CANCELLATION
     ------------------------------------------------------------------------ */
  describe('6. Order Management & Admin Cancellation', () => {
    it('lists orders with admin filters and customer details', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders?status=PLACED&limit=5`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.orders[0]).toHaveProperty('orderNumber');
      expect(res.body.data.orders[0]).toHaveProperty('user');
    });

    it('fetches complete single order details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${testOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(testOrder.id);
      expect(res.body.data.order.items.length).toBe(1);
    });

    it('advances order status along state machine (PLACED -> PACKED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PACKED' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('PACKED');
    });

    it('rejects invalid state transition (PACKED -> DELIVERED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${testOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('cancels order by admin and replenishes MongoDB stock', async () => {
      const beforeStock = (await Product.findById(testProduct._id)).variants[0].stock;

      const res = await request(app)
        .post(`/api/v1/admin/orders/${testOrder.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancellationReason: 'Customer requested cancellation via phone' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('CANCELLED');

      // Verify stock replenishment in Mongo (item quantity was 2)
      const afterStock = (await Product.findById(testProduct._id)).variants[0].stock;
      expect(afterStock).toBe(beforeStock + 2);
    });
  });

  /* ------------------------------------------------------------------------
     7. CUSTOMER MANAGEMENT & ACCOUNT BLOCKING
     ------------------------------------------------------------------------ */
  describe('7. Customer Management & Account Blocking', () => {
    it('lists customers with order count aggregation', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers?limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customers.length).toBeGreaterThanOrEqual(1);
      const cust = res.body.data.customers.find((c) => c.id === customerUser.id);
      expect(cust).toBeDefined();
      expect(cust.role).toBe('CUSTOMER');
    });

    it('blocks a customer, revokes their active refresh tokens, and records audit log', async () => {
      // Seed a refresh token for customer
      await prisma.refreshToken.create({
        data: {
          userId: customerUser.id,
          tokenHash: `test_token_hash_${timestamp}`,
          familyId: `fam_${timestamp}`,
          expiresAt: new Date(Date.now() + 86400000),
          isRevoked: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isBlocked: true,
          reason: 'Suspicious abusive behavior reported',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isBlocked).toBe(true);

      // Verify user is blocked in DB
      const dbUser = await prisma.user.findUnique({ where: { id: customerUser.id } });
      expect(dbUser.isBlocked).toBe(true);

      // Verify refresh tokens were revoked
      const tokens = await prisma.refreshToken.findMany({ where: { userId: customerUser.id } });
      expect(tokens.every((t) => t.isRevoked)).toBe(true);

      // Verify audit log entry
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'BLOCK_USER', entityId: customerUser.id },
      });
      expect(audit).toBeDefined();
    });

    it('unblocks the customer on subsequent request', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerUser.id}/block`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBlocked: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isBlocked).toBe(false);

      const dbUser = await prisma.user.findUnique({ where: { id: customerUser.id } });
      expect(dbUser.isBlocked).toBe(false);
    });
  });

  /* ------------------------------------------------------------------------
     8. COUPONS & BANNERS CRUD
     ------------------------------------------------------------------------ */
  describe('8. Coupons & Banners CRUD', () => {
    let createdCouponId;
    let createdBannerId;

    it('creates, updates, and deletes an admin coupon in MySQL', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `FESTIVE${timestamp.toString().slice(-4)}`,
          discountType: 'PERCENTAGE',
          discountValue: 25,
          minOrderAmount: 299,
          maxDiscountAmount: 75,
          validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
          isActive: true,
        });

      expect(createRes.status).toBe(201);
      createdCouponId = createRes.body.data.coupon.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 30 });

      expect(updateRes.status).toBe(200);
      expect(Number(updateRes.body.data.coupon.discountValue)).toBe(30);

      // Delete
      const delRes = await request(app)
        .delete(`/api/v1/admin/coupons/${createdCouponId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });

    it('creates, updates, and deletes an admin hero banner in MongoDB', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Admin Test Monsoon Sale ${timestamp}`,
          imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da',
          badgeText: 'LIMITED OFFER',
          displayOrder: 1,
        });

      expect(createRes.status).toBe(201);
      createdBannerId = createRes.body.data.banner._id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/admin/banners/${createdBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ badgeText: 'EXCLUSIVE DEAL' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.banner.badgeText).toBe('EXCLUSIVE DEAL');

      // Delete
      const delRes = await request(app)
        .delete(`/api/v1/admin/banners/${createdBannerId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });
  });

  /* ------------------------------------------------------------------------
     9. AUDIT LOGS & LOGIN LOGS VIEWER
     ------------------------------------------------------------------------ */
  describe('9. Audit Logs & Login Logs Viewer', () => {
    it('returns paginated audit logs with actor and entity metadata', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.auditLogs[0]).toHaveProperty('action');
      expect(res.body.data.auditLogs[0]).toHaveProperty('entityType');
    });

    it('returns paginated login logs with success status and user data', async () => {
      const res = await request(app)
        .get('/api/v1/admin/login-logs?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(Array.isArray(res.body.data.loginLogs)).toBe(true);
    });
  });
});
