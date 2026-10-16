// server/tests/catalog.test.js
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { Category, Product } from '../src/models/index.js';
import { cache } from '../src/utils/cache.js';

describe('Phase 4: Catalog APIs Test Suite', () => {
  let sampleCategory;
  let sampleProduct;

  beforeAll(async () => {
    await connectMongoDB();

    // Ensure cache is empty before test suite runs
    cache.flush();

    sampleCategory = await Category.findOne({ isActive: true }).lean();
    sampleProduct = await Product.findOne({ isAvailable: true }).lean();
  });

  afterAll(async () => {
    cache.flush();
    await disconnectMongoDB();
    await prisma.$disconnect();
  });

  describe('1. Category APIs', () => {
    it('GET /api/v1/categories returns list of active categories with product counts', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(8);

      const first = res.body.data.categories[0];
      expect(first.name).toBeDefined();
      expect(first.slug).toBeDefined();
      expect(first.icon).toBeDefined();
      expect(typeof first.productCount).toBe('number');
    });

    it('GET /api/v1/categories/:slug returns single category details', async () => {
      expect(sampleCategory).toBeDefined();

      const res = await request(app).get(`/api/v1/categories/${sampleCategory.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.slug).toBe(sampleCategory.slug);
      expect(res.body.data.category.name).toBe(sampleCategory.name);
      expect(typeof res.body.data.category.productCount).toBe('number');
    });

    it('GET /api/v1/categories/:slug returns 404 for non-existent category', async () => {
      const res = await request(app).get('/api/v1/categories/non-existent-category-slug-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('2. Product Listing, Pagination, and Filters', () => {
    it('GET /api/v1/products returns paginated products with metadata', async () => {
      const res = await request(app).get('/api/v1/products?limit=10&page=1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBeLessThanOrEqual(10);

      const { pagination } = res.body;
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.total).toBeGreaterThanOrEqual(60);
      expect(pagination.totalPages).toBeGreaterThanOrEqual(6);
      expect(pagination.hasNextPage).toBe(true);
      expect(pagination.hasPrevPage).toBe(false);
    });

    it('filters products by category slug', async () => {
      expect(sampleCategory).toBeDefined();

      const res = await request(app).get(`/api/v1/products?category=${sampleCategory.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.categorySlug).toBe(sampleCategory.slug);
      }
    });

    it('filters products by price range (minPrice, maxPrice)', async () => {
      const minPrice = 30;
      const maxPrice = 80;

      const res = await request(app).get(
        `/api/v1/products?minPrice=${minPrice}&maxPrice=${maxPrice}`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.primaryPrice).toBeGreaterThanOrEqual(minPrice);
        expect(prod.primaryPrice).toBeLessThanOrEqual(maxPrice);
      }
    });

    it('filters products by inStock status', async () => {
      const res = await request(app).get('/api/v1/products?inStock=true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.totalStock).toBeGreaterThan(0);
      }
    });

    it('sorts products by price ascending (price_asc)', async () => {
      const res = await request(app).get('/api/v1/products?sort=price_asc&limit=10');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.primaryPrice);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('sorts products by price descending (price_desc)', async () => {
      const res = await request(app).get('/api/v1/products?sort=price_desc&limit=10');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.primaryPrice);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });
  });

  describe('3. Product Detail API', () => {
    it('GET /api/v1/products/:slugOrId returns product details with reviews and category', async () => {
      expect(sampleProduct).toBeDefined();

      const res = await request(app).get(`/api/v1/products/${sampleProduct.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe(sampleProduct.name);
      expect(res.body.data.product.slug).toBe(sampleProduct.slug);
      expect(Array.isArray(res.body.data.product.variants)).toBe(true);
      expect(Array.isArray(res.body.data.product.reviews)).toBe(true);
      expect(res.body.data.product.categoryId).toBeDefined();
    });

    it('returns product details by ObjectId as well', async () => {
      expect(sampleProduct).toBeDefined();

      const res = await request(app).get(`/api/v1/products/${sampleProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product._id).toBe(String(sampleProduct._id));
    });

    it('returns 404 for non-existent product', async () => {
      const res = await request(app).get('/api/v1/products/non-existent-product-slug-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('4. Search & Autocomplete Suggestions', () => {
    it('GET /api/v1/search executes full-text search with textScore ranking', async () => {
      const res = await request(app).get('/api/v1/search?q=milk');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.query).toBe('milk');
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThan(0);

      // Verify returned products contain search term or relevance score
      const first = res.body.data.products[0];
      expect(first.score).toBeDefined();
    });

    it('GET /api/v1/search rejects request when query "q" is missing', async () => {
      const res = await request(app).get('/api/v1/search');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/search/suggestions returns autocomplete suggestions for products and categories', async () => {
      const res = await request(app).get('/api/v1/search/suggestions?q=mil');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toBeDefined();
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.categories).toBeDefined();
      expect(Array.isArray(res.body.data.categories)).toBe(true);
    });

    it('verifies /autocomplete alias endpoint works identical to /suggestions', async () => {
      const res = await request(app).get('/api/v1/search/autocomplete?q=amul');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });
  });

  describe('5. Home Feed Aggregation', () => {
    it('GET /api/v1/home returns aggregated banners, categories, featured sections, and trending products', async () => {
      const res = await request(app).get('/api/v1/home');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { data } = res.body;
      expect(Array.isArray(data.banners)).toBe(true);
      expect(data.banners.length).toBeGreaterThanOrEqual(1);

      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThanOrEqual(8);

      expect(Array.isArray(data.featuredSections)).toBe(true);
      expect(data.featuredSections.length).toBeGreaterThan(0);
      expect(data.featuredSections[0].products).toBeDefined();

      expect(Array.isArray(data.trendingProducts)).toBe(true);
      expect(data.trendingProducts.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/feed alias works identically to /home', async () => {
      const res = await request(app).get('/api/v1/feed');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.banners).toBeDefined();
    });
  });

  describe('6. Pincode Serviceability', () => {
    it('confirms serviceable Mumbai pincode with dark store hub and ETA', async () => {
      const res = await request(app).get('/api/v1/serviceability/400001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serviceable).toBe(true);
      expect(res.body.data.city).toBe('Mumbai');
      expect(res.body.data.estimatedDeliveryMinutes).toBe(10);
      expect(res.body.data.hubName).toMatch(/Mumbai/i);
    });

    it('confirms serviceable Delhi pincode', async () => {
      const res = await request(app).get('/api/v1/serviceability/110001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serviceable).toBe(true);
      expect(res.body.data.city).toBe('New Delhi');
    });

    it('returns unserviceable for pincode outside dark store network', async () => {
      const res = await request(app).get('/api/v1/serviceability/799001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.serviceable).toBe(false);
      expect(res.body.data.message).toMatch(/not yet serviceable/i);
    });

    it('rejects invalid pincode format with 400 validation error', async () => {
      const res = await request(app).get('/api/v1/serviceability/12345'); // Only 5 digits

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('supports pincode check via query parameter', async () => {
      const res = await request(app).get('/api/v1/serviceability?pincode=560001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.city).toBe('Bengaluru');
    });
  });

  describe('7. In-Memory Caching & HTTP Headers', () => {
    it('sets X-Cache: MISS on first request and X-Cache: HIT on subsequent request', async () => {
      cache.flush();

      // First call (cache miss)
      const res1 = await request(app).get('/api/v1/categories');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');
      expect(res1.headers['cache-control']).toMatch(/public, max-age=120/);

      // Second call (cache hit)
      const res2 = await request(app).get('/api/v1/categories');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
      expect(res2.body.data.categories.length).toBe(res1.body.data.categories.length);
    });
  });

  describe('8. OpenAPI / Swagger Documentation', () => {
    it('GET /api/docs serves the Swagger UI documentation', async () => {
      const res = await request(app).get('/api/docs/');

      // Swagger UI returns 200 HTML or redirect
      expect([200, 301, 302]).toContain(res.status);
    });

    it('GET /api/docs.json returns valid OpenAPI 3.0 specification JSON', async () => {
      const res = await request(app).get('/api/docs.json');

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toMatch(/Zippy/i);
      expect(res.body.paths['/api/v1/products']).toBeDefined();
      expect(res.body.paths['/api/v1/categories']).toBeDefined();
      expect(res.body.paths['/api/v1/search']).toBeDefined();
    });
  });
});
