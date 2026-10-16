# Phase 4: Catalog APIs

## Goal

Design, build, and deploy the high-throughput, public-facing **Catalog Engine** for **Zippy**:

1. **Category Hierarchy & Browsing (`/api/v1/categories`):**
   - Active category listing sorted by `displayOrder`.
   - Real-time product counts aggregated per category.
   - Category slug details lookup.
2. **Product Catalog Engine (`/api/v1/products`):**
   - Paginated product listing (`page`, `limit`) with complete metadata (`total`, `totalPages`, `hasNextPage`, `hasPrevPage`).
   - Multi-attribute filtering: category (slug or ObjectId), price range (`minPrice`, `maxPrice`), stock availability (`inStock=true`), brand, and minimum customer rating.
   - Flexible sorting: `price_asc`, `price_desc`, `rating`, `popular`, and `newest`.
   - Detailed product view by `slug` or `ObjectId` with populated category and customer reviews.
3. **Search & Autocomplete Suggestions (`/api/v1/search`):**
   - Full-text search leveraging MongoDB text indexes (`$text: { $search: q }`) ranked by text score relevance.
   - High-speed, debounced-friendly autocomplete suggestions (`/suggestions` and `/autocomplete`) returning matching products and categories.
4. **Home Feed Aggregation (`/api/v1/home`, `/api/v1/feed`):**
   - Composite payload combining promotional hero banners, category grids, featured category product rails (top 4 categories with 6 products each), and trending grocery essentials.
5. **Pincode Delivery Serviceability (`/api/v1/serviceability`, `/api/v1/pincodes`):**
   - 6-digit Indian postal code verification mapping serviceable dark store hubs (Mumbai, Delhi, Bengaluru, Pune, Hyderabad), 10-minute delivery ETAs, free delivery thresholds, and delivery fee calculation.
6. **In-Memory Caching & HTTP Headers:**
   - Adapter-based in-memory caching layer (`MemoryCacheAdapter`) supporting drop-in Redis replacement.
   - Caching middleware emitting standard HTTP headers (`Cache-Control: public, max-age=..., stale-while-revalidate=30`, `X-Cache: HIT / MISS`).
7. **OpenAPI / Swagger Documentation (`/api/docs`):**
   - Interactive OpenAPI 3.0 documentation served via Swagger UI at `/api/docs` and machine-readable specification at `/api/docs.json` (configurable via `ENABLE_SWAGGER` in production).

---

## What Was Done

1. **In-Memory Cache Architecture (`server/src/utils/cache.js`):**
   - Created `MemoryCacheAdapter` implementing `get`, `set`, `del`, `flush`, and `size`.
   - Built `cacheMiddleware(ttlSeconds, prefix)` intercepting `res.json` on successful 200 GET responses and serving instant cached payloads with `X-Cache: HIT`.
   - Configured HTTP caching headers (`Cache-Control: public, max-age=..., stale-while-revalidate=30`).
2. **Delivery Serviceability Engine (`server/src/services/serviceability.service.js`):**
   - Defined active metropolitan dark store hubs covering Mumbai (400xxx), Delhi NCR (110xxx), Bengaluru (560xxx), Pune (411xxx), and Hyderabad (500xxx).
   - Returns 10-12 minute delivery ETAs, dark store names, free delivery thresholds (₹199), and standard delivery fees (₹15).
3. **Zod Validation Schemas (`server/src/validation/catalog.validation.js`):**
   - Strict query and parameter validation for `productQuerySchema`, `searchQuerySchema`, `suggestionsQuerySchema`, `slugParamSchema`, and `pincodeParamSchema`.
4. **Catalog Controllers & Routing (`server/src/controllers/`, `server/src/routes/v1/`):**
   - `category.controller.js` & `category.routes.js`: List categories with aggregation pipeline and slug lookup (cached for 120s).
   - `product.controller.js` & `product.routes.js`: Paginated product listing with compound filters and detailed views (cached for 60s).
   - `search.controller.js` & `search.routes.js`: MongoDB text index query and prefix autocomplete suggestions.
   - `home.controller.js` & `home.routes.js`: Composite home screen feed aggregation (cached for 60s).
   - `serviceability.controller.js` & `serviceability.routes.js`: Pincode validation and dark store coverage lookup.
5. **OpenAPI 3.0 Swagger Specification (`server/src/docs/swagger.js`, `server/src/app.js`):**
   - Complete schema and endpoint documentation for Catalog, Search, Serviceability, Auth, and Health routes.
   - Mounted Swagger UI at `/api/docs` and JSON spec at `/api/docs.json`.
6. **Server Startup Hardening (`server/src/server.js`):**
   - Integrated asynchronous database connections (`connectMongoDB()`, `prisma.$connect()`) prior to binding HTTP listener.
   - Clean database disconnection during graceful shutdown.
7. **Automated Testing Suite (`server/tests/catalog.test.js`):**
   - Authored 26 automated unit and integration tests verifying categories, pagination, filtering, full-text search, autocomplete suggestions, home feed, serviceability, cache headers, and Swagger documentation.

---

## Files Created / Changed

- `server/package.json` - Added `swagger-ui-express`.
- `pnpm-workspace.yaml` - Approved build scripts for dependency resolution.
- `server/src/server.js` - Added asynchronous database initialization (`connectMongoDB`, `prisma.$connect`) and graceful teardown.
- `server/src/app.js` - Mounted Swagger UI at `/api/docs` and JSON spec at `/api/docs.json`.
- `server/src/docs/swagger.js` - Complete OpenAPI 3.0 specification for Zippy REST APIs.
- `server/src/utils/cache.js` - Memory cache adapter and caching middleware with HTTP headers.
- `server/src/services/serviceability.service.js` - 6-digit Indian postal code dark store coverage and delivery ETA mapper.
- `server/src/validation/catalog.validation.js` - Zod validation schemas for catalog queries and route parameters.
- `server/src/controllers/category.controller.js` - Category listing with real-time product counts and slug details.
- `server/src/controllers/product.controller.js` - Product listing with pagination, filters, sorting, and detail view.
- `server/src/controllers/search.controller.js` - Full-text search with textScore and autocomplete suggestions.
- `server/src/controllers/home.controller.js` - Aggregated home feed combining banners, categories, and featured rails.
- `server/src/controllers/serviceability.controller.js` - Delivery serviceability controller.
- `server/src/routes/v1/category.routes.js` - Category routes.
- `server/src/routes/v1/product.routes.js` - Product routes.
- `server/src/routes/v1/search.routes.js` - Search and autocomplete routes.
- `server/src/routes/v1/home.routes.js` - Home feed routes.
- `server/src/routes/v1/serviceability.routes.js` - Serviceability and pincode check routes.
- `server/src/routes/v1/index.js` - Mounted catalog domain routers under `/api/v1`.
- `server/tests/catalog.test.js` - 26 comprehensive tests for all catalog capabilities.
- `docs/phases/PHASE_4_CATALOG.md` - Phase 4 architecture, endpoints, decisions, and verification log.

---

## Commands to Run and Verify

Refresh the environment PATH in PowerShell before running checks:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 1. Run Automated Linter

```powershell
pnpm run lint
```

_Expected: 0 errors and 0 warnings across `@zippy/server` and `@zippy/client`._

### 2. Run Comprehensive Test Suite

```powershell
pnpm run test
```

_Expected: All 68 tests pass across the monorepo (26 catalog tests, 27 auth tests, 11 database tests, 4 health tests in server; 2 client tests)._

### 3. Run Production Build

```powershell
pnpm run build
```

_Expected: Production client bundles compile cleanly._

### 4. Live Background Server Smoke Test (Start, Test, Stop)

```powershell
# Start server in background
$serverJob = Start-Process pnpm -ArgumentList "dev:server" -PassThru
Start-Sleep -Seconds 3

# 1. Categories listing with product counts
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/categories"

# 2. Product listing with category filter
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/products?limit=2&category=dairy-bread-eggs"

# 3. Full-text search for "milk"
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/search?q=milk"

# 4. Search autocomplete suggestions for "mil"
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/search/suggestions?q=mil"

# 5. Delivery serviceability check (Mumbai: 400001)
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/serviceability/400001"

# 6. OpenAPI Swagger documentation spec
Invoke-RestMethod -Uri "http://localhost:5000/api/docs.json"

# Stop background server
Stop-Process -Id $serverJob.Id -Force
```

---

## Decisions and Why

1. **MongoDB Text Index vs. SQL LIKE Queries:**
   - Quick-commerce search queries are fuzzy and diverse (e.g. searching "milk", "amul milk", "toned milk"). MongoDB's compound text index (`product_fulltext_search_idx`) with custom weighting (`name: 10`, `tags: 5`, `brand: 3`, `description: 1`) yields relevance scoring (`$meta: "textScore"`) with sub-millisecond execution times.
2. **Adapter Pattern for In-Memory Caching:**
   - Wrapping the caching layer in an abstract interface (`MemoryCacheAdapter`) decouples application code from storage details. When scaling across multiple containers in production, the memory adapter can be replaced with a `RedisCacheAdapter` without modifying controller or route logic.
3. **HTTP Stale-While-Revalidate Headers:**
   - Quick-commerce product catalogs change infrequently compared to order volumes. Sending `Cache-Control: public, max-age=60, stale-while-revalidate=30` allows CDNs, reverse proxies, and browsers to serve immediate responses while asynchronously refreshing content in the background.
4. **Pincode Dark Store Hub Routing:**
   - Quick commerce relies on hyper-local dark store networks (within 2-3 km radii) rather than centralized warehouses. Defining dark store hub mappings by postal code ranges provides accurate 10-minute delivery promises before users start building carts.

---

## Issues Faced and Fixes

1. **MongoDB Connection Missing in server.js Startup:**
   - _Issue:_ While unit tests established MongoDB connections via test hooks, `server.js` was binding Express to the network before `connectMongoDB()` was invoked, causing live HTTP requests to hit Mongoose buffering timeouts.
   - _Fix:_ Refactored `server.js` to asynchronously await `connectMongoDB()` and `prisma.$connect()` prior to starting the HTTP listener, with clean disconnections during graceful shutdown.
2. **Category Slug Mismatch in Smoke Test:**
   - _Issue:_ The initial smoke test queried `category=dairy-breakfast`, but the seeded slug was `dairy-bread-eggs`.
   - _Fix:_ Queried active category slugs dynamically via `/api/v1/categories` and verified accurate filtering with `category=dairy-bread-eggs`.

---

## Security Notes

1. **Zero Real Secrets in Source Control:**
   - All connection strings and seed passwords remain in the git-ignored `.env`.
   - Documentation uses placeholders and never exposes real credentials.
2. **Protection of Swagger Documentation in Production:**
   - Swagger documentation at `/api/docs` is automatically disabled in production unless explicitly enabled via `ENABLE_SWAGGER=true`.
3. **NoSQL Injection Sanitization:**
   - All catalog query and route parameters pass through `express-mongo-sanitize` and strict Zod validation, preventing operator injection attacks (`$gt`, `$where`).

---

## What is Next

Proceed to **Phase 5: Cart, checkout, orders, payments**:

- Guest cart in client, merged into persistent server cart on login.
- Address book management (normalized in MySQL `addresses` table).
- Coupon application and validation (`coupons` & `coupon_usages`).
- Atomic stock decrement with MySQL transactions to prevent overselling.
- Razorpay order creation, payment signature verification, and webhook handling.
- Cash on Delivery (COD) payment flow.
- Idempotency key protection on order creation.
- Order status state machine (Placed, Packed, Out for Delivery, Delivered, Cancelled) and order tracking endpoints.
