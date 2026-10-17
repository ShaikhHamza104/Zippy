# Zippy ⚡ — 10-Minute Quick-Commerce Grocery Platform

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=githubactions)](.github/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/tests-165%20passed-success?logo=vitest)](docs/phases/PHASE_11_TESTING.md)
[![E2E Automation](https://img.shields.io/badge/Playwright%20E2E-100%25%20Green-emerald?logo=playwright)](e2e/)
[![Load Benchmark](https://img.shields.io/badge/Autocannon-0.00%25%20Errors-brightgreen)](scripts/load-test.js)
[![Docker Hardened](https://img.shields.io/badge/Docker-Non--Root%20Multi--Stage-2496ED?logo=docker)](docker-compose.prod.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A production-ready, ultra-fast quick-commerce grocery web application (inspired by Blinkit and Zepto) built on a modern **React 18 + Node.js 20 + Dual-Database (MySQL 8.4 + MongoDB 8.0)** enterprise stack.

---

## 🏗️ Architecture & Dual-Database Strategy

Zippy separates concerns across its persistence layer to deliver both high-throughput catalog browsing and strictly consistent, financial-grade order processing:

- **MySQL 8.4 LTS (via Prisma ORM):** Handles relational, transactional data requiring strict ACID guarantees — Users, RBAC roles (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`), delivery addresses, hashed refresh token families, login logs, audit logs, orders, immutable order item snapshots, payment transactions, and coupons.
- **MongoDB 8.0 (via Mongoose ODM):** Handles dynamic documents and high read-throughput catalog assets — Products, multi-variant SKUs, inventory counts, active shopping carts, category hierarchies, promotional banners, and customer reviews.
- **Atomic Stock Reservation:** Stock is decremented atomically in MongoDB (`variants.stock: { $gte: quantity }`). If the subsequent multi-table MySQL transaction fails, a compensating rollback restores the exact reserved units to inventory.

👉 **For complete interactive Mermaid diagrams, sequence flows, and state machines, see [docs/APPLICATION_FLOW.md](docs/APPLICATION_FLOW.md).**

---

## ✨ Feature Matrix

### 🛒 Customer Storefront

- **10-Minute Pincode Serviceability:** Instant dark store serviceability validation (`/api/v1/serviceability/:pincode`) with SLA calculations (default hub: `560001` Bengaluru).
- **Catalog Discovery & Live Search:** Homepage promotional banners, category navigation rails, trending essentials, and a debounced live search dropdown with full search filters.
- **Multi-Variant Product Experience:** Unit selector (e.g. 500g, 1kg, 2L), dynamic pricing/MRP updates, instant savings badges, and stock availability alerts.
- **Interactive Cart & Stepper:** Add items via `+ ADD` stepper (`+` / `-`), slide-out cart drawer, live bill breakdown, free delivery threshold indicator, and coupon redemption engine.
- **Cash on Delivery (COD) & Online Payments:** Complete checkout flow supporting Cash on Delivery (COD) and Razorpay integration (Cards, UPI, NetBanking).
- **Live Order Tracking:** Real-time visual fulfillment timeline tracking orders through `Order Placed` ➔ `Packing at Dark Store` ➔ `Out for Delivery` ➔ `Delivered`.

### 🛡️ Admin Backoffice (`/admin`)

- **Code-Split & Guarded:** Lazy-loaded bundle wrapped in `RoleRoute` ensuring customer storefront bundles never download administrative code.
- **Dashboard KPIs:** Real-time cards displaying orders today, today's revenue, total revenue, active customers, order status breakdown, and low-stock SKU alerts.
- **Product & Category CRUD:** Modal forms with multi-variant pricing, brand, and automated in-memory catalog cache invalidation on every mutation.
- **Secure Image Upload Pipeline:** Strict MIME-type validation (JPEG/PNG/WebP), file size limits, and automated WebP resizing via Sharp.
- **Logistics Fulfillment:** Advance order states (`PLACED` ➔ `PACKED` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED`), or cancel orders with stock restoration.
- **Security & Auditability:** Search and block customer accounts (instantly revoking all active refresh tokens), and view historical admin mutation logs.

### 🔒 Enterprise Security

- **Argon2id Password Hashing:** Resistant to GPU/ASIC cracking with timing-safe comparison.
- **Dual-Token Authentication:** 15-minute JWT access tokens + rotating refresh tokens in `httpOnly, Secure, SameSite=Lax` cookies with family reuse attack detection.
- **CSRF Mitigation:** Required custom security headers (`X-Zippy-Client: web`, `X-Requested-With: XMLHttpRequest`).
- **Defense in Depth:** Helmet HTTP headers, rate limiting (auth + API), `express-mongo-sanitize`, parameterized Prisma queries, and non-root Docker execution (`USER node` & `USER nginx`).

---

## 🚀 Quick Start Guide

### Prerequisites

- Node.js **20+ LTS** (`node -v`)
- pnpm **10+** (`pnpm -v`)
- Local or Docker daemons for MySQL 8.4 and MongoDB 8.0

### 1. Workstation Setup (Windows PowerShell)

```powershell
# 1. Clone repository
git clone https://github.com/your-org/zippy.git
cd zippy

# 2. Configure development environment variables
Copy-Item .env.development .env

# 3. Install monorepo dependencies
pnpm install

# 4. Generate Prisma Client & Run Database Migrations
pnpm --filter @zippy/server prisma:generate
pnpm --filter @zippy/server prisma:migrate

# 5. Seed Catalog Products & Default Super Admin
pnpm seed

# 6. Start Development Servers (Backend :5000 + Frontend :5173)
pnpm dev
```

### 2. Docker Compose (Production Stack)

```bash
# 1. Copy production template and set real secrets
cp .env.production.example .env

# 2. Build and launch hardened multi-container stack
docker compose -f docker-compose.prod.yml up -d --build

# 3. Deploy database migrations and seed catalog
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec server node src/database/seed.js

# 4. Access storefront via Nginx
# Storefront: http://localhost:80 (or your configured HTTPS domain)
# Health Check: http://localhost:80/health
```

👉 **For complete production setup, Let's Encrypt SSL, and cloud platform guides (Render/Railway), read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).**

---

## 🧪 Testing, Quality Gates & Benchmarks

| Test Suite / Quality Gate       | Tooling                                 | Results                                                                                                                                                                                                                                                                                                                                           |
| :------------------------------ | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit & Integration Tests**    | Vitest v2.1.9 (`@vitest/coverage-v8`)   | **165 passed (100%)**<br/>• Server: 112 passed (77.91% Stmts, 80.57% Funcs)<br/>• Client: 53 passed (UI Kit: 96.99%, Stores: 80.57%)                                                                                                                                                                                                              |
| **End-to-End (E2E) Automation** | Playwright v1.64.1 (Chromium)           | **2 passed (17.2s total)**<br/>• Customer Journey (Signup, Pincode, Browse, Cart, COD): **5.0s**<br/>• Admin Journey (Login, Product CRUD, Fulfillment): **6.9s**                                                                                                                                                                                 |
| **Load & Stress Benchmarks**    | Autocannon v8.0.0 (10 connections)      | **12,981 total requests, 0.00% error rate**<br/>• `/health`: 994.00 RPS (p50: 8ms, p99: 36ms)<br/>• `/api/v1/categories`: 766.40 RPS (p50: 11ms, p99: 38ms)<br/>• `/api/v1/products`: 400.00 RPS (p50: 20ms, p99: 89ms)<br/>• `/api/v1/home`: 283.40 RPS (p50: 32ms, p99: 69ms)<br/>• `/api/v1/search?q=milk`: 153.60 RPS (p50: 61ms, p99: 100ms) |
| **Static Code Analysis**        | ESLint Flat Config (`eslint.config.js`) | **0 errors, 0 warnings** across monorepo                                                                                                                                                                                                                                                                                                          |
| **Production Build**            | Vite v6.4.4 (Code-Split Rollup)         | **Compiled in 15.7s** with clean chunk distribution                                                                                                                                                                                                                                                                                               |

---

## 📚 Documentation Index

### Core Guides

- 📖 [Master Architecture & Application Flow (`docs/APPLICATION_FLOW.md`)](docs/APPLICATION_FLOW.md) — 10 architectural sections with interactive Mermaid diagrams.
- 🚀 [Production Deployment Runbook (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md) — VPS checklist, zero-downtime migrations, SSL certbot, and Render/Railway guides.

### Complete Phase Execution Logs (Phases 0–13)

- [Phase 0: Environment Setup & Tooling](docs/phases/PHASE_0_SETUP.md)
- [Phase 1: Project Scaffolding & Monorepo Structure](docs/phases/PHASE_1_SCAFFOLD.md)
- [Phase 2: Dual Database Architecture & Seed Data](docs/phases/PHASE_2_DATABASE.md)
- [Phase 3: Authentication & Security Core](docs/phases/PHASE_3_AUTH_SECURITY.md)
- [Phase 4: Product Catalog & Discovery APIs](docs/phases/PHASE_4_CATALOG.md)
- [Phase 5: Cart, Checkout, Orders & Payments](docs/phases/PHASE_5_ORDERS_PAYMENTS.md)
- [Phase 6: Admin Backoffice APIs](docs/phases/PHASE_6_ADMIN_API.md)
- [Phase 7: Frontend Foundation & Design System](docs/phases/PHASE_7_FRONTEND_FOUNDATION.md)
- [Phase 8: Customer UI Components & Flows](docs/phases/PHASE_8_CUSTOMER_UI.md)
- [Phase 9: Admin UI Backoffice Portal](docs/phases/PHASE_9_ADMIN_UI.md)
- [Phase 10: Security Hardening & Performance](docs/phases/PHASE_10_HARDENING.md)
- [Phase 11: Full Testing & Load Benchmarks](docs/phases/PHASE_11_TESTING.md)
- [Phase 12: Production Setup & Deployment](docs/phases/PHASE_12_DEPLOYMENT.md)
- [Phase 13: Final Application Flow Documentation](docs/phases/PHASE_13_APPLICATION_FLOW.md)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Built with ❤️ by Mohd Hamza Shaikh for quick-commerce engineering.
