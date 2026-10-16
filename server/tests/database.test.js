// server/tests/database.test.js
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateSuperAdminSecurity } from '../src/config/securityGuards.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { Category, Product } from '../src/models/index.js';

describe('Database Layer Verification (Prisma & Mongoose)', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await disconnectMongoDB();
  });

  describe('MySQL (Prisma ORM)', () => {
    it('verifies exactly one SUPER_ADMIN user exists with email admin@zippy.com', async () => {
      const adminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' },
      });
      expect(adminCount).toBe(1);

      const admin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });

      expect(admin).toBeDefined();
      expect(admin?.email).toBe('admin@zippy.com');
      expect(admin?.role).toBe('SUPER_ADMIN');
    });

    it('verifies super admin password hash validates against SUPER_ADMIN_PASSWORD from env', async () => {
      const admin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });
      expect(admin).toBeDefined();

      const envPassword = process.env.SUPER_ADMIN_PASSWORD;
      expect(envPassword).toBeDefined();

      const isMatch = await bcrypt.compare(envPassword, admin.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('verifies coupons use Decimal types for currency amounts', async () => {
      const coupon = await prisma.coupon.findUnique({
        where: { code: 'WELCOME50' },
      });

      expect(coupon).toBeDefined();
      expect(coupon?.discountValue).toBeInstanceOf(Prisma.Decimal);
      expect(Number(coupon?.discountValue)).toBe(50.0);
      expect(Number(coupon?.minOrderAmount)).toBe(199.0);
    });

    it('verifies referential integrity in Prisma schema', async () => {
      const user = await prisma.user.findFirst();
      expect(user).toBeDefined();

      const addresses = await prisma.address.findMany({
        where: { userId: user?.id },
      });
      expect(Array.isArray(addresses)).toBe(true);
    });
  });

  describe('Production Security Guard', () => {
    it('refuses execution in production mode when super admin password is weak', () => {
      expect(() => {
        validateSuperAdminSecurity('admin@zippy.com', 'root@123', 'production');
      }).toThrow(/\[SECURITY FATAL\] Weak SUPER_ADMIN_PASSWORD/);

      expect(() => {
        validateSuperAdminSecurity('admin@zippy.com', 'short', 'production');
      }).toThrow(/\[SECURITY FATAL\] Weak SUPER_ADMIN_PASSWORD/);
    });

    it('refuses execution in production mode when admin email uses .local or .test domains', () => {
      expect(() => {
        validateSuperAdminSecurity(
          'admin@zippy.local',
          'SuperStrongRandomPassword#2026',
          'production'
        );
      }).toThrow(/\[SECURITY FATAL\] Insecure SUPER_ADMIN_EMAIL/);
    });

    it('allows strong credentials in production mode', () => {
      expect(() => {
        validateSuperAdminSecurity(
          'admin@zippy.com',
          'SuperStrongRandomPassword#2026',
          'production'
        );
      }).not.toThrow();
    });
  });

  describe('MongoDB (Mongoose)', () => {
    it('verifies no stray _init or init collections exist', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);

      expect(collectionNames).not.toContain('_init');
      expect(collectionNames).not.toContain('init');

      const expectedCollections = ['banners', 'carts', 'categories', 'products', 'reviews'];
      for (const expected of expectedCollections) {
        expect(collectionNames).toContain(expected);
      }
    });

    it('verifies 8 grocery categories are present with slugs and icons', async () => {
      const count = await Category.countDocuments();
      expect(count).toBeGreaterThanOrEqual(8);

      const dairy = await Category.findOne({ slug: 'dairy-bread-eggs' });
      expect(dairy).toBeDefined();
      expect(dairy?.name).toContain('Dairy');
    });

    it('verifies 60+ grocery products exist with variants and stock', async () => {
      const count = await Product.countDocuments();
      expect(count).toBeGreaterThanOrEqual(60);

      const milk = await Product.findOne({ slug: 'amul-taaza-toned-milk-1l' });
      expect(milk).toBeDefined();
      expect(milk?.variants.length).toBeGreaterThanOrEqual(1);
      expect(milk?.totalStock).toBeGreaterThan(0);
      expect(milk?.isAvailable).toBe(true);
    });

    it('verifies MongoDB full-text index returns relevant search results', async () => {
      const results = await Product.find(
        { $text: { $search: 'chips' } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });

      expect(results.length).toBeGreaterThan(0);
      const hasChipsInNameOrTag = results.some(
        (p) => p.name.toLowerCase().includes('chips') || p.tags.includes('chips')
      );
      expect(hasChipsInNameOrTag).toBe(true);
    });
  });
});
