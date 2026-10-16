# Phase 2: Database Design and Data Layer

## Goal

Design and deploy a dual-database persistence architecture for **Zippy**:

1. **MySQL 8.4 LTS (via Prisma ORM):** For relational, ACID-compliant financial and transactional domains (Users, RBAC, Addresses, Refresh Tokens, Login Logs, Audit Logs, Orders, Order Items, Payments, Coupons, and Coupon Usages) with strict `DECIMAL(10,2)` types for monetary amounts.
2. **MongoDB 8.0 (via Mongoose):** For high-throughput, unstructured catalog reads and flexible documents (Categories, Products with unit variants, Carts with TTL, Promotional Banners, and Product Reviews) with full-text search and compound filtering indexes.
3. **Idempotent Seeding:** Implement a robust, repeatable seed pipeline populating a Super Admin user from environment variables, promotional coupons, 8 grocery categories, 64+ realistic grocery products with multiple variants, promotional banners, and reviews.

---

## Data Layer Architecture: MySQL vs. MongoDB Split

Quick-commerce applications like Blinkit or Zepto exhibit two distinctly different access patterns:

1. **Catalog Browsing & Search (MongoDB):** High read volume, semi-structured product variants (weights, packs, dimensions), nested images, category hierarchies, and full-text search requirements. Document modeling in MongoDB avoids expensive multi-table joins on every listing page hit.
2. **Checkout, Auth & Money Transactions (MySQL):** Financial ledgers, stock reservation transactions, order placement, and authentication require strict ACID guarantees, foreign key integrity, row-level locks, and immutable snapshots.

| Domain / Collection / Table | Database | ORM / Driver | Rationale                                                                                                                                                                                                               |
| --------------------------- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`, `roles`            | MySQL    | Prisma       | Relational security, foreign keys to logs and orders, strict unique constraints.                                                                                                                                        |
| `addresses`                 | MySQL    | Prisma       | Normalized address book linked to user accounts.                                                                                                                                                                        |
| `refresh_tokens`            | MySQL    | Prisma       | Token rotation families and immediate revocation for session security.                                                                                                                                                  |
| `login_logs`, `audit_logs`  | MySQL    | Prisma       | Append-only security audit trail for user access and administrative actions.                                                                                                                                            |
| `orders`, `order_items`     | MySQL    | Prisma       | ACID transactional guarantees. `order_items` stores an immutable snapshot (`nameSnapshot`, `priceSnapshot`, `imageSnapshot`, `quantity`) so historical orders remain valid even if catalog items change or are removed. |
| `payments`                  | MySQL    | Prisma       | Relational tracking of payment status, Razorpay identifiers, amounts, and transaction outcomes.                                                                                                                         |
| `coupons`, `coupon_usages`  | MySQL    | Prisma       | Concurrency-safe coupon limits, user usage tracking, and exact monetary discounts.                                                                                                                                      |
| `categories`                | MongoDB  | Mongoose     | Flexible hierarchy, display orders, icons, and dynamic categorization.                                                                                                                                                  |
| `products`                  | MongoDB  | Mongoose     | Complex multi-variant modeling (SKUs, weights, MRP, price, stock), full-text search indexes (`$text`), and compound listing indexes.                                                                                    |
| `carts`                     | MongoDB  | Mongoose     | High-frequency guest & user carts with automatic MongoDB TTL expiration (`expires: '0s'`).                                                                                                                              |
| `banners`                   | MongoDB  | Mongoose     | Marketing campaign assets, promo tags, and scheduling dates.                                                                                                                                                            |
| `reviews`                   | MongoDB  | Mongoose     | Customer ratings and feedback linked across products.                                                                                                                                                                   |

---

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    %% MySQL Relational Models
    USER ||--o{ ADDRESS : "has"
    USER ||--o{ REFRESH_TOKEN : "owns"
    USER ||--o{ LOGIN_LOG : "generates"
    USER ||--o{ AUDIT_LOG : "performs"
    USER ||--o{ ORDER : "places"
    USER ||--o{ COUPON_USAGE : "redeems"

    ORDER ||--|{ ORDER_ITEM : "contains"
    ORDER ||--o| PAYMENT : "settled_via"
    ORDER ||--o{ COUPON_USAGE : "applies"

    COUPON ||--o{ COUPON_USAGE : "tracked_in"

    %% MySQL Schema Definitions
    USER {
        string id PK "UUID"
        string email UK
        string phone UK
        string password_hash
        string name
        enum role "CUSTOMER | ADMIN | SUPER_ADMIN"
        boolean is_blocked
        int failed_login_attempts
        datetime lockout_until
        boolean email_verified
        datetime deleted_at "Soft delete"
        datetime created_at
        datetime updated_at
    }

    ADDRESS {
        string id PK "UUID"
        string user_id FK
        string full_name
        string phone
        string address_line1
        string address_line2
        string city
        string state
        string pincode
        boolean is_default
        datetime deleted_at "Soft delete"
    }

    REFRESH_TOKEN {
        string id PK "UUID"
        string user_id FK
        string token_hash UK
        string family_id "Rotation group"
        datetime expires_at
        boolean is_revoked
    }

    ORDER {
        string id PK "UUID"
        string order_number UK
        string user_id FK
        enum status "PLACED|PACKED|OUT_FOR_DELIVERY|DELIVERED|CANCELLED"
        decimal subtotal "DECIMAL(10,2)"
        decimal discount_amount "DECIMAL(10,2)"
        decimal delivery_fee "DECIMAL(10,2)"
        decimal total_amount "DECIMAL(10,2)"
        json delivery_address "Address snapshot"
        string coupon_code
        string idempotency_key UK
        datetime created_at
    }

    ORDER_ITEM {
        string id PK "UUID"
        string order_id FK
        string mongo_product_id "Cross-DB Ref"
        string name_snapshot
        decimal price_snapshot "DECIMAL(10,2)"
        string image_snapshot
        int quantity
        decimal total_price "DECIMAL(10,2)"
    }

    PAYMENT {
        string id PK "UUID"
        string order_id FK, UK
        decimal amount "DECIMAL(10,2)"
        enum method "RAZORPAY | COD"
        enum status "PENDING | COMPLETED | FAILED | REFUNDED"
        string razorpay_order_id UK
        string razorpay_payment_id UK
        string razorpay_signature
        json raw_response
    }

    COUPON {
        string id PK "UUID"
        string code UK
        enum discount_type "PERCENTAGE | FLAT"
        decimal discount_value "DECIMAL(10,2)"
        decimal min_order_amount "DECIMAL(10,2)"
        decimal max_discount_amount "DECIMAL(10,2)"
        int usage_limit
        int usage_count
        datetime valid_from
        datetime valid_until
        boolean is_active
    }

    COUPON_USAGE {
        string id PK "UUID"
        string coupon_id FK
        string user_id FK
        string order_id FK
        decimal discount_applied "DECIMAL(10,2)"
        datetime created_at
    }

    LOGIN_LOG {
        string id PK "UUID"
        string user_id FK
        string email
        string ip_address
        string user_agent
        boolean success
        string fail_reason
        datetime created_at
    }

    AUDIT_LOG {
        string id PK "UUID"
        string user_id FK
        string action
        string entity_type
        string entity_id
        text details
        string ip_address
        datetime created_at
    }

    %% MongoDB Document Collections
    CATEGORY ||--o{ PRODUCT : "categorizes"
    PRODUCT ||--o{ REVIEW : "reviewed_in"

    CATEGORY {
        ObjectId _id PK
        string name UK
        string slug UK, IDX
        string image
        string icon
        int displayOrder IDX
        boolean isActive IDX
    }

    PRODUCT {
        ObjectId _id PK
        string name "Text Search"
        string slug UK, IDX
        string description "Text Search"
        ObjectId categoryId FK, IDX
        string categorySlug IDX
        string brand "Text Search"
        array variants "unit, price, mrp, stock, sku"
        number primaryPrice IDX
        number totalStock IDX
        array tags "Text Search"
        boolean isAvailable IDX
        number ratingAverage
        int reviewCount
    }

    CART {
        ObjectId _id PK
        string userId IDX "MySQL User UUID"
        string sessionId IDX "Guest Token"
        array items "productId, variantSku, quantity, priceAtAdd"
        string couponCode
        date expiresAt TTL "Auto delete after 30d"
    }

    BANNER {
        ObjectId _id PK
        string title
        string imageUrl
        string linkUrl
        string badgeText
        int displayOrder IDX
        boolean isActive IDX
    }

    REVIEW {
        ObjectId _id PK
        ObjectId productId FK, IDX
        string userId IDX "MySQL User UUID"
        string userName
        number rating "1-5"
        string comment
        boolean isVerifiedPurchase
    }
```

---

## What Was Done

1. **MySQL Shadow Database & Least-Privilege Access:**
   - Created `zippy_dev_shadow` database using MySQL root credentials from `.env`.
   - Granted full DDL and DML permissions on `zippy_dev_shadow` to `zippy_user`.
   - Configured `SHADOW_DATABASE_URL` in `.env` and `.env.example`, enabling non-root `prisma migrate dev` execution without granting global root privileges to `zippy_user`.
2. **Prisma Relational Schema Definition:**
   - Authored `server/prisma/schema.prisma` with 10 production models and 5 Enums.
   - Enforced `@db.Decimal(10, 2)` across all financial fields (`subtotal`, `discountAmount`, `deliveryFee`, `totalAmount`, `priceSnapshot`, `totalPrice`, `amount`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`).
   - Configured cascade deletion rules, soft deletion support (`deletedAt`), and relational indexes.
   - Designed `OrderItem` with immutable product snapshot columns (`nameSnapshot`, `priceSnapshot`, `imageSnapshot`, `quantity`).
   - Executed migration `20261016142012_init_mysql_schema` to generate tables and client bindings.
3. **Mongoose Document Schemas & Indexes:**
   - Created `Category.js`, `Product.js`, `Cart.js`, `Banner.js`, and `Review.js` in `server/src/models/`.
   - Built full-text search index (`product_fulltext_search_idx`) with weighted attributes on Product:
     - `name`: Weight 10
     - `tags`: Weight 5
     - `brand`: Weight 3
     - `description`: Weight 1
   - Built compound listing indexes (`category_listing_idx` on `{ categoryId: 1, isAvailable: 1, primaryPrice: 1, totalStock: 1 }`).
   - Configured MongoDB TTL index on Cart documents (`expires: '0s'`).
4. **Database Connection Managers:**
   - Created `server/src/database/prisma.js` singleton client with development event logging.
   - Created `server/src/database/mongo.js` with automated retry logic (5 attempts) and graceful teardown.
5. **Idempotent Seed Script:**
   - Authored `server/src/database/seed.js` executed via `pnpm seed` or `pnpm --filter @zippy/server seed`.
   - Populated Super Admin (`admin@zippy.com`) using bcrypt (cost 12) with credentials read safely from `.env`.
   - Populated 3 promotional coupons (`WELCOME50`, `ZIPPY100`, `FREESHIP`).
   - Populated 8 grocery categories.
   - Populated 64 realistic grocery products across all categories with multiple unit variants, realistic prices, images, and inventory stock.
   - Populated 3 promotional banners and sample reviews.
   - Verified that running the seed script multiple times produces identical document counts without duplicate errors.
6. **Automated Testing & Real Verification:**
   - Authored `server/tests/database.test.js` validating Prisma models, Decimal types, Mongoose document counts, and full-text index queries.
   - Verified zero linting errors (`pnpm run lint`), passing tests (`pnpm run test`), and successful production compilation (`pnpm run build`).

---

## Files Created / Changed

- `.env` - Added `SHADOW_DATABASE_URL` and `SUPER_ADMIN_*` seed configurations (never committed).
- `.env.example` - Updated with non-sensitive template placeholders.
- `package.json` - Added root `seed` script.
- `pnpm-workspace.yaml` - Approved build scripts for `@prisma/client`, `@prisma/engines`, and `prisma`.
- `server/package.json` - Added `@prisma/client`, `mongoose`, `bcryptjs`, `prisma`, and database scripts.
- `server/prisma.config.js` - Prisma CLI configuration loading the root `.env` dynamically across commands.
- `server/prisma/schema.prisma` - Complete MySQL relational schema.
- `server/prisma/migrations/20261016142012_init_mysql_schema/migration.sql` - Generated migration SQL.
- `server/src/config/securityGuards.js` - Production password and domain validation guard for Super Admin.
- `server/src/database/prisma.js` - Prisma client singleton.
- `server/src/database/mongo.js` - Mongoose connection manager with retry.
- `server/src/database/seed.js` - Comprehensive idempotent seed script.
- `server/src/models/Category.js` - Category Mongoose model.
- `server/src/models/Product.js` - Product Mongoose model with variants, full-text, and compound indexes.
- `server/src/models/Cart.js` - Cart Mongoose model with TTL index.
- `server/src/models/Banner.js` - Promotional banner Mongoose model.
- `server/src/models/Review.js` - Customer review Mongoose model.
- `server/src/models/index.js` - Barrel export for Mongoose models.
- `server/tests/database.test.js` - Vitest test suite for database layer.
- `docs/phases/PHASE_2_DATABASE.md` - Phase 2 architecture documentation, ER diagram, and verification log.

---

## Commands to Run and Verify

Refresh the environment PATH in PowerShell before running checks:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 1. Verify MySQL Tables and Schema

Connect using credentials directly from `.env`:

```powershell
mysql -u zippy_user --password="<password from .env>" -D zippy_dev -e "SHOW TABLES;"
```

_Expected: 11 tables (`_prisma_migrations`, `addresses`, `audit_logs`, `coupon_usages`, `coupons`, `login_logs`, `order_items`, `orders`, `payments`, `refresh_tokens`, `users`)._

### 2. Verify Super Admin and Coupons in MySQL

```powershell
mysql -u zippy_user --password="<password from .env>" -D zippy_dev -e "
SELECT id, name, email, role, is_blocked FROM users WHERE role='SUPER_ADMIN';
SELECT code, discount_type, discount_value, min_order_amount, is_active FROM coupons;
"
```

### 3. Verify MongoDB Documents and Full-Text Search

```powershell
mongosh zippy_dev --eval '
print("Categories count: " + db.categories.countDocuments());
print("Products count: " + db.products.countDocuments());
print("Banners count: " + db.banners.countDocuments());

print("\nFull-text search test for \"milk\":");
printjson(db.products.find({ $text: { $search: "milk" } }, { name: 1, brand: 1, primaryPrice: 1 }).limit(2).toArray());
'
```

_Expected: 8 categories, 64 products, 3 banners, and text search results matching "milk"._

### 4. Run Automated Database Layer Tests

```powershell
pnpm run test
```

_Expected: All 17 tests pass across `@zippy/server` (15 tests) and `@zippy/client` (2 tests)._

### 5. Verify Idempotent Seed

```powershell
pnpm run seed
```

_Expected: Seed runs and reports verified counts without errors._

---

## Decisions and Why

1. **Decimal vs. Float for Currency:**
   - Binary floating-point numbers (`float` / `double`) suffer from precision rounding errors (e.g. `0.1 + 0.2 !== 0.3`). Financial transactions, order totals, and discounts must be exact. All monetary amounts use `@db.Decimal(10, 2)` mapped to Prisma's Decimal type.
2. **Order Item Product Snapshot:**
   - Catalog products undergo price updates, rebranding, image updates, or discontinuation. If orders referenced product rows dynamically, modifying a product would retrospectively alter order history. `OrderItem` stores immutable snapshots of name, price, image, and quantity captured at checkout.
3. **Shadow Database for Non-Root Prisma Migrations:**
   - `prisma migrate dev` creates a temporary shadow database to detect schema drift. By pre-creating `zippy_dev_shadow` and configuring `SHADOW_DATABASE_URL`, `zippy_user` operates strictly within its designated databases without requiring dangerous global `CREATE DATABASE` root privileges.
4. **Weighted MongoDB Text Search:**
   - Quick-commerce users search by item name, brand, or general tags (e.g. "chips", "atta", "milk"). Weighting `name` (10) above `tags` (5) and `brand` (3) ensures the most relevant products appear first.
5. **Cart TTL Automatic Expiration:**
   - Abandoned guest carts accumulate rapidly in e-commerce. MongoDB's native TTL index (`expires: '0s'`) automatically purges expired carts from disk without needing scheduled cron scripts.

---

## Phase 2 Cleanup

Following Phase 2 verification, three cleanup and hardening fixes were completed:

1. **Stray MongoDB Collections Removed (Fix 1):**
   - Dropped lingering collections `_init` and `init` from MongoDB database `zippy_dev`.
   - Verified that no runtime code, seed script, or test suite creates these collections.
   - Confirmed with `db.getCollectionNames()` that only 5 canonical collections exist: `banners`, `carts`, `categories`, `products`, `reviews`.

2. **Super Admin Credentials & Production Safety Guards (Fix 2):**
   - Configured super admin email (`admin@zippy.com`) and password (`<password from .env>`), managed strictly through root `.env` (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`). Updated `.env.example` with non-sensitive template placeholders.
   - Updated the existing MySQL `SUPER_ADMIN` record without duplicate row insertion, maintaining relational consistency.
   - Implemented `validateSuperAdminCredentials` in `server/src/config/securityGuards.js`. When `NODE_ENV=production`, server startup and seeding refuse to execute if the password is under 12 characters, found in common dictionary lists, or if the email domain is `.local` or `.test`. In non-production environments, an informative warning is logged.
   - Validated super admin authentication via bcrypt comparison against the stored hash and verified that exactly 1 super admin record exists.

3. **Consolidated Root Environment Resolution (Fix 3):**
   - Removed the NTFS hard link `server/.env`.
   - Created `server/prisma.config.js` to dynamically load root `.env` via `path.resolve(__dirname, '../.env')` using `dotenv.config()`.
   - Configured server runtime in `server/src/config/env.js` to explicitly load root `.env` from its absolute file path.
   - Added `"prisma:status"` npm script and confirmed that `pnpm prisma:status`, `pnpm seed`, `pnpm test`, and `pnpm dev` function seamlessly from both repository root and `server/`.
   - Verified that no `.env` files exist within `server/` and that the root `.env` is securely ignored by git.

---

## Security Notes

1. **Zero Secrets in Source Control:**
   - Database credentials and super admin seed passwords exist solely in the root `.env`.
   - The root `.env` is verified as excluded via `git check-ignore`; no `.env` files reside in sub-packages or source control.
   - `.env.example` provides non-sensitive template placeholders.
2. **Bcrypt Password Hashing:**
   - The super admin user's password is encrypted using `bcryptjs` with a work factor cost of 12 before being persisted into MySQL. Plaintext passwords are never stored or logged.
3. **Least Privilege Enforcement:**
   - `zippy_user` is restricted exclusively to `zippy_dev` and `zippy_dev_shadow`. No administrative privileges on MySQL system databases are granted.

---

## What is Next

Proceed to **Phase 3: Authentication and security core**:

- Customer & Admin registration, login, logout, and token rotation.
- Short-lived JWT access tokens (15 min) + rotating refresh tokens in `httpOnly, Secure, SameSite` cookies with reuse detection.
- RBAC middleware (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`).
- Rate limiting (stricter on auth routes), account lockout after repeated failed logins, login logging, and audit logging.
- Forgot/reset password with OTP/link and email verification stubs.
- Unit and integration tests for all auth and attack scenarios.
