# Zippy: Complete Application Flow & Architecture Guide

> **Author:** Antigravity Team & Mohd Hamza Shaikh  
> **System Name:** Zippy (10-Minute Quick Commerce Platform)  
> **Architecture Pattern:** Dual-Database Event-Driven MERN Monorepo  
> **Target Release:** v1.0.0 (Production Ready)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication & Security Flow](#2-authentication--security-flow)
3. [Customer Shopping Journey](#3-customer-shopping-journey)
4. [Checkout, Payment & Atomic Stock Sequence](#4-checkout-payment--atomic-stock-sequence)
5. [Order Status State Machine](#5-order-status-state-machine)
6. [Admin Backoffice Workflow](#6-admin-backoffice-workflow)
7. [Dual-Database Split Rationale & Data Flow](#7-dual-database-split-rationale--data-flow)
8. [Monorepo Directory Structure](#8-monorepo-directory-structure)
9. [Operations Handbook (Local Run, Deployment & Debugging)](#9-operations-handbook)
10. [Future Improvements Roadmap](#10-future-improvements-roadmap)

---

## 1. System Architecture

Zippy employs a decoupled, multi-tiered architecture orchestrated via Docker Compose and Nginx. Traffic enters through Nginx, which serves static frontend assets directly with 1-year immutable caching and reverse-proxies RESTful API requests to the Express.js backend. The backend bridges a dual-database persistence layer: MySQL 8.4 for ACID-critical transactional data and MongoDB 8.0 for catalog and dynamic document data.

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client Tier"]
        Browser["Customer & Admin Browser (SPA)"]
    end

    subgraph IngressLayer["Edge Ingress & Reverse Proxy"]
        Nginx["Hardened Nginx 1.27 (Alpine)<br/>• TLS 1.3 Termination<br/>• Gzip Static Compression<br/>• 1-Yr Immutable Asset Cache<br/>• Security Headers"]
    end

    subgraph AppLayer["Application Tier (Node.js 20 LTS)"]
        API["Express.js REST API Server (:5000)<br/>• Helmet & CORS Protection<br/>• Dual Rate Limiters (Auth + API)<br/>• Pino Structured Logger<br/>• Zod Request Validation<br/>• Sharp Image Processing"]
        Cache["In-Memory Catalog Cache<br/>(TTL 60s + Mutation Invalidation)"]
    end

    subgraph PersistenceLayer["Dual-Database Persistence Tier"]
        MySQL[("MySQL 8.4 LTS (Prisma ORM)<br/>• Users & RBAC Roles<br/>• Refresh Tokens & Sessions<br/>• Orders & OrderItems Snapshots<br/>• Payments & Transactions<br/>• Coupons & Usages<br/>• Audit & Login Security Logs")]
        Mongo[("MongoDB 8.0 (Mongoose ODM)<br/>• Products & Multi-Variants<br/>• Inventory & Dark Store Stock<br/>• Dynamic Active Carts<br/>• Categories & Hierarchy<br/>• Banners & Customer Reviews")]
    end

    subgraph ExternalServices["Third-Party & Auxiliary Services"]
        Razorpay["Razorpay Payment Gateway<br/>(Order API + Webhook HMAC-SHA256)"]
        SMTP["Transactional Mailer (SMTP / SES)"]
        Storage["Storage Engine<br/>(Local Disk / S3 / Cloudinary)"]
    end

    Browser -->|"HTTPS (:443) / HTTP (:80)"| Nginx
    Nginx -->|"Static Files (Vite SPA)"| Browser
    Nginx -->|"Proxy Pass /api/* & /uploads/*"| API
    API <-->|"Catalog Query & Cache Sync"| Cache
    API -->|"Relational Queries & ACID Tx"| MySQL
    API -->|"Atomic Stock Updates & Documents"| Mongo
    API -->|"Card / UPI / NetBanking Orders"| Razorpay
    API -->|"Password Reset & Verification OTPs"| SMTP
    API -->|"Image Uploads (WebP Optimized)"| Storage
```

---

## 2. Authentication & Security Flow

Authentication uses a hardened, dual-token architecture:

- **Access Tokens:** Short-lived (15 minutes), signed via `HMAC-SHA256`, stored strictly in browser memory and tab-scoped `sessionStorage`.
- **Refresh Tokens:** Long-lived (7 days), stored in an `httpOnly, Secure, SameSite=Lax` cookie. Refresh tokens are hashed using SHA-256 before persistence in MySQL and rotated on every use.
- **Token Family Reuse Detection:** If an already-rotated token is presented (indicating token theft), the entire family of tokens for that user is immediately revoked.
- **CSRF Defense:** Custom header enforcement (`X-Zippy-Client: web` and `X-Requested-With: XMLHttpRequest`) prevents cross-site browser exploits.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer / Admin
    participant Client as React SPA Client
    participant API as Express Auth Controller
    participant MySQL as MySQL (Prisma)
    participant Mailer as Email Service (Nodemailer)

    %% Registration Flow
    Note over User,Mailer: 1. Customer Registration Flow
    User->>Client: Enters Name, Email, Password, Phone
    Client->>API: POST /api/v1/auth/register (with X-Zippy-Client header)
    API->>API: Validate Zod Schema & Hash Password (bcryptjs, cost 12)
    API->>MySQL: Create User (Role: CUSTOMER)
    API->>API: Generate Access Token (15m) & Refresh Token (7d)
    API->>MySQL: Store Hashed Refresh Token (Family ID, Active)
    API->>Mailer: Dispatch Email Verification Link (Signed Token)
    API-->>Client: Set-Cookie: zippy_refresh_token (httpOnly, Secure)<br/>Body: { user, accessToken }
    Client->>Client: Store accessToken in memory & sessionStorage

    %% Login & Rate Limiting Flow
    Note over User,MySQL: 2. Login Flow with Brute-Force Defense
    User->>Client: Submits Email & Password
    Client->>API: POST /api/v1/auth/login
    API->>API: Check Rate Limiter & Failed Login Counter
    alt Account is Locked (>= 5 failed attempts)
        API-->>Client: 429 Too Many Requests (Account Locked for 15 mins)
    else Password Mismatch
        API->>MySQL: Increment failedLoginAttempts, Record LoginLog (FAILURE)
        API-->>Client: 401 Unauthorized (Generic message to prevent email enumeration)
    else Valid Credentials
        API->>MySQL: Reset failedLoginAttempts, Record LoginLog (SUCCESS)
        API->>API: Issue new Access Token & Rotate Refresh Token
        API->>MySQL: Persist new RefreshToken record
        API-->>Client: Set-Cookie: new zippy_refresh_token<br/>Body: { user, accessToken }
    end

    %% Silent Refresh & Reuse Attack Detection
    Note over Client,MySQL: 3. Silent Refresh & Reuse Attack Detection
    Client->>API: POST /api/v1/auth/refresh (Cookie sent automatically)
    alt Token Revoked or Reused (Theft Attempt)
        API->>MySQL: Lookup token. If isRevoked === true:
        API->>MySQL: Revoke entire token family (familyId)
        API-->>Client: 401 Unauthorized (Session terminated, forced re-login)
    else Valid Active Refresh Token
        API->>MySQL: Mark old token as revoked
        API->>MySQL: Insert newly rotated RefreshToken into family
        API-->>Client: Set-Cookie: rotated refresh_token<br/>Body: { accessToken }
    end

    %% Logout Flow
    Note over Client,MySQL: 4. Secure Logout Flow
    User->>Client: Clicks Logout
    Client->>API: POST /api/v1/auth/logout
    API->>MySQL: Mark active RefreshToken as revoked
    API-->>Client: Set-Cookie: zippy_refresh_token=deleted (Max-Age=0)
    Client->>Client: Clear in-memory token, sessionStorage & localStorage
```

---

## 3. Customer Shopping Journey

The customer discovery experience is engineered for sub-second responses and instant delivery verification:

```mermaid
flowchart TD
    Start(["Customer Visits Zippy Homepage (/)"]) --> PincodeCheck{"Serviceable Pincode Set?"}

    PincodeCheck -->|"No"| OpenPinModal["Open Pincode Modal<br/>(Default: 560001 Bengaluru Hub)"]
    OpenPinModal --> FetchSLA["GET /api/v1/serviceability/:pincode"]
    FetchSLA -->|"Serviceable"| SetPincode["Store in UI Store & Display<br/>'Delivering in 10 mins'"]
    FetchSLA -->|"Unserviceable"| ShowOutOfReach["Display 'We are expanding to your area soon'"]

    PincodeCheck -->|"Yes"| LoadHome["GET /api/v1/home<br/>• Promotional Banners<br/>• Category Navigation Rails<br/>• Trending Essentials Rail"]
    SetPincode --> LoadHome

    LoadHome --> Discovery{"Customer Action"}

    Discovery -->|"Search Bar (Debounced)"| SearchLive["GET /api/v1/search/suggestions?q=...<br/>Displays instant suggestion rail"]
    SearchLive --> SearchResults["GET /api/v1/search?q=...<br/>Product Grid with Category & Price Filters"]

    Discovery -->|"Category Rail / Navigation"| CategoryBrowse["GET /api/v1/products?category=slug<br/>Sort by Price, Popularity, Rating"]

    Discovery -->|"Product Card Click"| PDP["GET /api/v1/products/:slug<br/>• Multi-Variant Selector (Unit, Pack, MRP)<br/>• Real-time stock status<br/>• Customer Reviews & Ratings"]

    SearchResults --> AddToCart["Click '+ ADD' Stepper"]
    CategoryBrowse --> AddToCart
    PDP --> AddToCart

    AddToCart --> CartStateUpdate["POST /api/v1/cart/items<br/>• If logged in: binds to userId<br/>• If guest: binds to x-session-id"]

    CartStateUpdate --> OpenDrawer["Open Slide-Out Cart Drawer"]
    OpenDrawer --> ApplyCouponOption{"Apply Coupon?"}

    ApplyCouponOption -->|"Yes"| ApplyCoupon["POST /api/v1/cart/coupon<br/>(e.g., 'ZIPPY50', 'WELCOME10')"]
    ApplyCoupon --> BillBreakdown["Live Bill Breakdown:<br/>• Items Total (MRP)<br/>• Product Savings<br/>• Delivery Fee (Free if > ₹199)<br/>• Grand Total"]
    ApplyCouponOption -->|"No"| BillBreakdown

    BillBreakdown --> ProceedCheckout["Click 'Proceed to Checkout'"]
    ProceedCheckout --> AuthCheck{"Authenticated?"}
    AuthCheck -->|"No"| RedirectLogin["Navigate to /login (Preserve Return URL)"]
    RedirectLogin -->|"Login Success"| MergeCart["POST /api/v1/cart/merge (Guest to User)"]
    MergeCart --> CheckoutPage["Navigate to /checkout"]
    AuthCheck -->|"Yes"| CheckoutPage
```

---

## 4. Checkout, Payment & Atomic Stock Sequence

Zippy ensures zero overselling across high-concurrency demand surges. Stock is decremented atomically in MongoDB with a conditional `$gte` check. If the subsequent MySQL transaction fails, MongoDB stock is automatically restored via a compensating rollback.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Web as Checkout UI
    participant OrderCtrl as Order Controller
    participant Mongo as MongoDB (Products & Carts)
    participant MySQL as MySQL (Prisma Transaction)
    participant Razorpay as Razorpay API

    Customer->>Web: Selects Address, Payment Method (COD / RAZORPAY), Clicks "Place Order"
    Web->>OrderCtrl: POST /api/v1/orders/checkout<br/>{ addressId, paymentMethod, couponCode, idempotencyKey }

    Note over OrderCtrl,MySQL: Step 1: Idempotency Check
    OrderCtrl->>MySQL: prisma.order.findUnique({ where: { idempotencyKey } })
    opt Order already exists for idempotencyKey
        OrderCtrl-->>Web: 200 OK (Return existing processed order)
    end

    Note over OrderCtrl,Mongo: Step 2: Live Price & Stock Calculation
    OrderCtrl->>Mongo: Cart.findOne({ userId })
    OrderCtrl->>OrderCtrl: calculateCartBreakdown(cart.items, couponCode, userId)
    opt Out of stock or requested qty > available
        OrderCtrl-->>Web: 409 Conflict (INSUFFICIENT_STOCK: Item Unavailable)
    end

    Note over OrderCtrl,Mongo: Step 3: MongoDB Atomic Stock Reservation
    loop For each item in cart
        OrderCtrl->>Mongo: Product.findOneAndUpdate(<br/>  { _id, 'variants.sku': sku, 'variants.stock': { $gte: qty } },<br/>  { $inc: { 'variants.$.stock': -qty, totalStock: -qty } }<br/>)
        alt Stock decrement failed (Contention: Another user bought last unit)
            OrderCtrl->>Mongo: Compensating Rollback: Increment stock for all previously reserved items
            OrderCtrl-->>Web: 409 Conflict (Stock contention error)
        end
    end

    Note over OrderCtrl,MySQL: Step 4: MySQL ACID Transaction ($transaction)
    OrderCtrl->>MySQL: BEGIN TRANSACTION
    MySQL->>MySQL: 1. Insert Order (status: 'PLACED', address snapshot, totals)
    MySQL->>MySQL: 2. Insert OrderItems (immutable price, SKU, name, image snapshots)
    MySQL->>MySQL: 3. Insert Payment (status: 'PENDING', method: COD/RAZORPAY)
    MySQL->>MySQL: 4. Insert CouponUsage & increment coupon count (if coupon applied)
    alt MySQL Transaction Fails
        MySQL-->>OrderCtrl: ROLLBACK TRANSACTION
        OrderCtrl->>Mongo: Compensating Rollback: Increment MongoDB stock for all reserved items
        OrderCtrl-->>Web: 500 Internal Error (Transaction aborted, stock restored)
    else MySQL Transaction Commits
        MySQL-->>OrderCtrl: COMMIT TRANSACTION (Order Created)
    end

    Note over OrderCtrl,Mongo: Step 5: Post-Commit Cleanup
    OrderCtrl->>Mongo: Cart.deleteOne({ userId })

    Note over OrderCtrl,Razorpay: Step 6: Payment Gateway Initialization
    alt Payment Method is RAZORPAY
        OrderCtrl->>Razorpay: razorpay.orders.create({ amount, currency: 'INR', receipt })
        Razorpay-->>OrderCtrl: { razorpayOrderId, amount, status: 'created' }
        OrderCtrl->>MySQL: Update Payment with razorpayOrderId
        OrderCtrl-->>Web: 201 Created { order, razorpay: { orderId, keyId } }
        Web->>Web: Launch Razorpay Checkout Modal
        Customer->>Razorpay: Completes UPI / Card Payment
        Razorpay-->>Web: { razorpayPaymentId, razorpaySignature }
        Web->>OrderCtrl: POST /api/v1/payments/verify
        OrderCtrl->>OrderCtrl: Verify HMAC-SHA256 signature
        OrderCtrl->>MySQL: Update Payment status to 'COMPLETED'
    else Payment Method is COD
        OrderCtrl-->>Web: 201 Created { order, razorpay: null }
    end

    Web->>Web: Redirect to /orders/:orderId/success ("Arriving in 10 Minutes!")
```

---

## 5. Order Status State Machine

The order fulfillment workflow models an instant 10-minute dispatch life-cycle:

```mermaid
stateDiagram-v2
    [*] --> PLACED: Order Submitted & Stock Reserved

    PLACED --> PACKED: Dark Store Picker Gathers & Bags Items
    PLACED --> CANCELLED: Customer or Admin Cancels Order

    PACKED --> OUT_FOR_DELIVERY: Assigned to Rider & Leaves Store
    PACKED --> CANCELLED: Out of Stock / Damaged Goods / Customer Request

    OUT_FOR_DELIVERY --> DELIVERED: Rider Reaches Customer (COD Payment Collected)
    OUT_FOR_DELIVERY --> CANCELLED: Customer Unavailable / Wrong Address

    DELIVERED --> [*]: Terminal State (No Transitions Allowed)
    CANCELLED --> [*]: Terminal State (Stock Restored to MongoDB)

    note right of PLACED
        Customer Cancellation: ALLOWED
        Admin Cancellation: ALLOWED
        Stock: RESERVED
    end note

    note right of PACKED
        Customer Cancellation: ALLOWED
        Admin Cancellation: ALLOWED
        Stock: RESERVED
    end note

    note right of OUT_FOR_DELIVERY
        Customer Cancellation: BLOCKED (Rider is en route)
        Admin Cancellation: ALLOWED
        Stock: EN ROUTE
    end note

    note right of CANCELLED
        Action on Transition:
        • MongoDB variant & totalStock automatically restored
        • If paid online: Payment status set to REFUNDED
    end note

    note right of DELIVERED
        Action on Transition:
        • If COD: Payment status set to COMPLETED
    end note
```

---

## 6. Admin Backoffice Workflow

Backoffice administrative operations are restricted to `ADMIN` and `SUPER_ADMIN` roles via `RoleRoute` in React Router and `requireRole` on the API:

```mermaid
flowchart TD
    AdminLogin["Admin Logs in (/login)<br/>Must have ADMIN or SUPER_ADMIN role"] --> GuardCheck{"Role Verified?"}
    GuardCheck -->|"No"| Forbidden["403 Forbidden / Redirect to Storefront"]
    GuardCheck -->|"Yes"| Dashboard["/admin/dashboard<br/>• Orders Today & Total Revenue<br/>• Active Customer Counter<br/>• Status Breakdown (Placed, Packed, Out, Delivered)<br/>• Low-Stock SKU Alert Rail"]

    Dashboard --> AdminAction{"Admin Action"}

    AdminAction -->|"Catalog Management"| ProductAdmin["/admin/products<br/>• Paginated Catalog Table & Search<br/>• Create / Edit Product Form<br/>• Multi-Variant Units, MRP & Live Price<br/>• Explicit Stock Adjustment Modal"]
    ProductAdmin --> ImageUpload["POST /api/v1/admin/upload<br/>• MIME Allowlist (JPEG, PNG, WebP)<br/>• Sharp Resizing & WebP Conversion<br/>• Returns Public Asset URL"]
    ImageUpload --> SaveProduct["POST / PUT /api/v1/admin/products<br/>Invalidates In-Memory Catalog Cache"]

    AdminAction -->|"Logistics & Fulfillment"| OrderAdmin["/admin/orders<br/>• Filter by Status & Customer<br/>• View Order Items Snapshot<br/>• Advance Status: PLACED ➔ PACKED ➔ OUT ➔ DELIVERED<br/>• Cancel Order with Audit Reason"]

    AdminAction -->|"Customer Accounts"| CustomerAdmin["/admin/customers<br/>• Customer Search by Name, Email, Phone<br/>• View Order History & Lifetime Value<br/>• Block / Unblock Customer Account"]
    CustomerAdmin --> BlockAction["Block Customer<br/>• isBlocked set to true<br/>• All active RefreshTokens instantly revoked"]

    AdminAction -->|"Marketing Promotions"| CouponAdmin["/admin/coupons<br/>• Create Flat / Percentage Discounts<br/>• Set Expiry & Min Order Amount"]

    AdminAction -->|"Compliance & Security"| AuditLogs["/admin/audit-logs<br/>• View All Historical Admin Mutations<br/>• Captures: Admin ID, IP, Action, Entity, Changes"]

    SaveProduct --> AuditLogEntry["Audit Event Recorded in MySQL"]
    OrderAdmin --> AuditLogEntry
    BlockAction --> AuditLogEntry
    CouponAdmin --> AuditLogEntry
```

---

## 7. Dual-Database Split Rationale & Data Flow

### 7.1 Why Dual-Database?

| Criterion                      | MySQL 8.4 (Prisma ORM)                                                                                           | MongoDB 8.0 (Mongoose ODM)                                                            |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Primary Domain**             | Relational, transactional, financial, and security data                                                          | Catalog, inventory, dynamic documents, dynamic carts                                  |
| **ACID Transactions**          | Multi-table ACID transactions for order placement, item snapshots, payments, and coupons                         | Document-level atomic operators (`$inc`, `$set`, `$push`) for fast stock reservations |
| **Data Integrity**             | Foreign key constraints prevent orphaned records (e.g. order without user)                                       | Schema flexibility allows multi-variant product attributes (grams, ml, kg, bundles)   |
| **Order History Immutability** | Order items store **snapshots** (name, price, SKU, image) so historical orders never change if a product updates | Products evolve dynamically with changing prices, descriptions, and images            |
| **Read/Write Profile**         | High integrity, strictly consistent writes                                                                       | High throughput, sub-millisecond reads for catalog browsing                           |

### 7.2 Entity Mapping Matrix

```mermaid
flowchart LR
    subgraph MySQL_Store["MySQL 8.4 Relational Database"]
        U["User (Auth, Roles, Block status)"]
        A["Address (Delivery Coordinates)"]
        RT["RefreshToken (Hashed Token Families)"]
        LL["LoginLog (IP, UserAgent, Status)"]
        AL["AuditLog (Admin Mutation History)"]
        O["Order (Status, Totals, Delivery Snapshot)"]
        OI["OrderItem (Immutable Price & Name Snapshot)"]
        P["Payment (Method, Razorpay IDs, Status)"]
        C["Coupon (Discount Rules & Limits)"]
        CU["CouponUsage (Redemption Records)"]
    end

    subgraph MongoDB_Store["MongoDB 8.0 Document Database"]
        Prod["Product (Title, Brand, Multi-Variants, Images)"]
        Cat["Category (Name, Slug, Icon, Status)"]
        CartDoc["Cart (Active items, Quantities, Session/User ID)"]
        BannerDoc["Banner (Promotional Hero Rails)"]
        RevDoc["Review (Ratings & Verified Buyer Comments)"]
    end

    U ---|1:N| A
    U ---|1:N| RT
    U ---|1:N| LL
    U ---|1:N| O
    O ---|1:N| OI
    O ---|1:1| P
    O ---|0:N| CU
    C ---|1:N| CU
    U ---|1:N| AL

    Prod ---|References categoryId| Cat
    Prod ---|1:N Embedded| Prod
    CartDoc -.->|References mongoProductId & variantSku| Prod
    OI -.->|References mongoProductId snapshot| Prod
```

---

## 8. Monorepo Directory Structure

Zippy is structured as an enterprise pnpm workspace monorepo:

```
zippy/
├── .github/
│   ├── dependabot.yml              # Weekly dependency & security update schedules
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI: lint, audit, db-test, build, deploy
├── client/                         # Frontend Client Application (React 18 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/               # Route guards (ProtectedRoute, RoleRoute)
│   │   │   ├── cart/               # CartDrawer & Bill breakdown
│   │   │   ├── common/             # Header, Footer, BottomNav, ErrorBoundary
│   │   │   ├── product/            # ProductCard, VariantSelector, ReviewList
│   │   │   └── ui/                 # Accessible UI Kit (Button, Input, Modal, Toast, Badge)
│   │   ├── hooks/                  # Custom React hooks (useCart, useDebounce)
│   │   ├── layouts/                # RootLayout (Storefront) & AdminLayout (Backoffice)
│   │   ├── pages/
│   │   │   ├── admin/              # Lazy-loaded Backoffice pages (Dashboard, Products, Orders)
│   │   │   ├── auth/               # Login, Register, ForgotPassword, ResetPassword
│   │   │   ├── checkout/           # CheckoutPage (Address selection, COD, Razorpay)
│   │   │   ├── orders/             # OrderSuccessPage, OrdersListPage, OrderDetailPage
│   │   │   ├── profile/            # Customer ProfilePage
│   │   │   └── HomePage.jsx        # Landing storefront with category rails & banners
│   │   ├── services/               # HTTP client (apiFetch, silent refresh, queryClient)
│   │   ├── stores/                 # Zustand state stores (authStore, uiStore)
│   │   ├── App.jsx                 # Application entry with QueryClient & ErrorBoundary
│   │   ├── router.jsx              # React Router v6 code-split route configuration
│   │   └── main.jsx                # DOM mounting & Tailwind style imports
│   ├── Dockerfile                  # Hardened Nginx multi-stage build (USER nginx)
│   ├── package.json                # Client dependencies & scripts
│   └── vite.config.js              # Vite bundler, proxy configuration & chunk splitting
├── server/                         # Backend REST API Service (Node.js 20 LTS + Express)
│   ├── prisma/
│   │   ├── migrations/             # Versioned SQL migration history
│   │   └── schema.prisma           # Prisma schema definition (MySQL 8.4)
│   ├── src/
│   │   ├── config/                 # Env validation (Zod), Logger (Pino), Swagger
│   │   ├── controllers/            # Route controllers (auth, product, cart, order, admin)
│   │   ├── database/               # Database connectors (prisma.js, mongo.js, seed.js)
│   │   ├── middleware/             # Auth (JWT), RateLimiters, ErrorHandler, RequestID
│   │   ├── models/                 # Mongoose schemas (Product, Category, Cart, Banner)
│   │   ├── routes/v1/              # Versioned API routes (/auth, /products, /cart, /admin)
│   │   ├── services/               # External adapters (email, payment, serviceability, storage)
│   │   ├── utils/                  # Cryptography (tokens, passwords), Cache, ErrorTracker
│   │   ├── validation/             # Zod validation schemas for all incoming HTTP payloads
│   │   ├── app.js                  # Express middleware chain & route mounting
│   │   └── server.js               # HTTP listener & graceful shutdown handlers
│   ├── Dockerfile                  # Production multi-stage Dockerfile (USER node)
│   └── package.json                # Server dependencies & scripts
├── docker/
│   └── nginx/
│       ├── default.conf            # Virtual host, reverse proxy, SPA fallback, TLS template
│       └── nginx.conf              # Main Nginx process, gzip compression, and event loop
├── docs/
│   ├── DEPLOYMENT.md               # Production deployment runbook & cloud platform guides
│   ├── APPLICATION_FLOW.md         # Comprehensive system architecture & Mermaid diagrams
│   └── phases/                     # Historical logs for Phases 0 through 13
├── e2e/
│   ├── 1-customer-journey.spec.js  # Playwright E2E: Signup, Pincode, Browse, Cart, COD checkout
│   └── 2-admin-journey.spec.js     # Playwright E2E: Super Admin Login, Product CRUD, Status Update
├── scripts/
│   └── load-test.js                # Autocannon benchmark script (Throughput, Latency, Errors)
├── docker-compose.yml              # Local development compose stack
├── docker-compose.prod.yml         # Production compose stack (MySQL, Mongo, Server, Nginx)
├── package.json                    # Monorepo root manifest (scripts & dev tools)
├── pnpm-workspace.yaml             # pnpm workspace definition
└── playwright.config.js            # Playwright configuration with web server orchestration
```

---

## 9. Operations Handbook

### 9.1 How to Run Locally on Windows

1. **Prerequisites Check:**
   - Node.js v20+ and pnpm (`corepack enable && corepack prepare pnpm@latest --activate`).
   - MySQL 8.0+ running on port `3306` with database `zippy_dev`.
   - MongoDB 7.0+ running on port `27017` with database `zippy_dev`.

2. **Environment Setup:**

   ```powershell
   # Copy development environment template
   Copy-Item .env.development .env
   ```

3. **Install Dependencies & Initialize Databases:**

   ```powershell
   # 1. Install all monorepo dependencies
   pnpm install

   # 2. Generate Prisma Client & Run MySQL Migrations
   pnpm --filter @zippy/server prisma:generate
   pnpm --filter @zippy/server prisma:migrate

   # 3. Seed MongoDB Catalog and MySQL Super Admin
   pnpm seed
   ```

4. **Start Development Servers:**
   ```powershell
   # Launches backend (:5000) and frontend (:5173) concurrently
   pnpm dev
   ```

### 9.2 How to Deploy to Production

#### Option A: Linux VPS via Docker Compose (Recommended)

```bash
# 1. Clone repository to /opt/zippy
git clone https://github.com/your-org/zippy.git /opt/zippy && cd /opt/zippy

# 2. Configure production environment
cp .env.production.example .env
nano .env  # Enter your actual production domain and generated secrets

# 3. Obtain initial Let's Encrypt SSL certificate
sudo certbot certonly --standalone -d zippy.yourdomain.com

# 4. Launch the production stack
docker compose -f docker-compose.prod.yml up -d --build

# 5. Run migrations and seed production catalog
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec server node src/database/seed.js
```

#### Option B: Render or Railway Managed Platforms

- Connect your GitHub repository.
- Deploy `@zippy/server` via `server/Dockerfile` pointing to managed MySQL and MongoDB Atlas instances.
- Deploy `@zippy/client` as a static site using `pnpm build` with SPA rewrites to `/index.html`.

### 9.3 Troubleshooting Common Operational Issues

| Issue / Symptom                         | Root Cause                                                          | Solution                                                                                                                              |
| :-------------------------------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| **`EADDRINUSE: port 5000`**             | Another Node process or previous dev server is running on port 5000 | In PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process -Force`                          |
| **`401 Unauthorized` on Token Refresh** | Missing custom client header or expired refresh cookie              | Ensure `apiFetch` attaches `X-Zippy-Client: web`. In production, verify `COOKIE_SECURE=true` is used exclusively over HTTPS.          |
| **Prisma Migration Desynchronization**  | Database schema modified outside migration files                    | Run `pnpm --filter @zippy/server prisma:status` and resolve drift with `prisma migrate resolve`.                                      |
| **Sharp Image Native Library Error**    | Node.js native compilation mismatch on Alpine Linux                 | Ensure `libc6-compat` is installed in the Docker image. In local Windows, reinstall with `pnpm rebuild --filter @zippy/server sharp`. |
| **Empty Cart Alert on Checkout**        | Browsing as guest before login without session cart merge           | The backend automatically merges guest cart (`x-session-id`) into the user cart during checkout if the user cart is empty.            |

---

## 10. Future Improvements Roadmap

The modular architecture of Zippy is designed for rapid expansion:

1. **Distributed Caching & Shared Rate Limiting (Redis):**
   - Replace the in-memory catalog cache with an enterprise Redis Cluster.
   - Utilize `rate-limit-redis` to share rate-limiting quotas across multiple horizontal API server replicas.
2. **Real-Time Delivery Partner Fleet App:**
   - Build a lightweight React Native or Flutter mobile application for dark-store pickers and delivery riders.
   - Dispatch push notifications when an order enters `PACKED` state.
3. **Live Geolocation Map Tracking (WebSockets / SSE):**
   - Stream driver latitude/longitude updates via Server-Sent Events (SSE) or WebSockets directly to the customer's Order Tracking screen (`/orders/:orderId`).
4. **Multi-Dark Store Geofencing & Inventory Partitioning:**
   - Partition MongoDB product stock by `darkStoreId`.
   - Route customer orders to the nearest dark store within a 3km radius using MongoDB `$geoNear` indexing.
5. **Omnichannel Customer Notifications:**
   - Integrate WhatsApp Business API and SMS gateways (Twilio / Gupshup) for live order delivery updates.

---

_End of Application Flow Documentation._
