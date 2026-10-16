// server/tests/database.test.js
import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
    it('verifies seeded super admin user exists with SUPER_ADMIN role', async () => {
      const admin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });

      expect(admin).toBeDefined();
      expect(admin?.role).toBe('SUPER_ADMIN');
      expect(admin?.passwordHash).toBeDefined();
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

      // Ensure address table relation works
      const addresses = await prisma.address.findMany({
        where: { userId: user?.id },
      });
      expect(Array.isArray(addresses)).toBe(true);
    });
  });

  describe('MongoDB (Mongoose)', () => {
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
