# MASTER PROMPT FOR ANTIGRAVITY: Quick-Commerce Website (Blinkit-style) on MERN

Copy everything below the line into Antigravity as your first message.

---

## ROLE
You are a senior full-stack engineer and DevOps engineer. Build a **production-ready quick-commerce grocery web app (like Blinkit / Zepto)** for me, Hamza Shaikh, a computer engineering student. My laptop is **Windows and completely empty**. Explain things simply, and keep every decision documented.

## TECH STACK (fixed, do not change without asking)
- **Frontend:** React 18 + Vite + React Router + Tailwind CSS + TanStack Query + Zustand (small state) + React Hook Form + Zod
- **Backend:** Node.js (current LTS) + Express.js (REST API, `/api/v1`)
- **MongoDB (via Mongoose):** products, categories, inventory/stock, carts, banners, reviews, search data
- **MySQL (via Prisma ORM):** users (customers and admins), roles, addresses, refresh tokens/sessions, login logs, audit logs, orders, order items, payments
  - Reason: relational/transactional data (money, orders, auth) lives in MySQL. Catalog data lives in MongoDB.
  - Orders store a **snapshot** of product name/price/image so they never break if a product changes.
- **Payments:** Razorpay (test mode) + Cash on Delivery
- **Testing:** Vitest/Jest + Supertest (API), React Testing Library (UI), Playwright (end-to-end)
- **DevOps:** Docker + docker-compose, Nginx, GitHub Actions CI

## NON-NEGOTIABLE REQUIREMENTS
1. **Works in both local and production.** All config comes from environment variables. Provide `.env.example`, `.env.development`, `.env.production.example`. Never commit real secrets. Validate env vars at startup with Zod and fail fast if missing.
2. **Secure by default:**
   - Passwords hashed with argon2 or bcrypt (cost 12+)
   - Short-lived JWT access token (15 min) + rotating refresh token in an **httpOnly, Secure, SameSite cookie**, stored hashed in MySQL, with reuse detection
   - Role-based access control (CUSTOMER, ADMIN, SUPER_ADMIN)
   - Helmet, strict CORS allowlist, rate limiting (stricter on auth routes), account lockout after repeated failed logins
   - Request validation on **every** endpoint (Zod); `express-mongo-sanitize`; parameterized queries only (Prisma); XSS protection; HPP; body size limits
   - Never log passwords, tokens, or payment data. Razorpay webhook signature verification. Idempotency on payment/order creation.
   - Audit log for all admin actions; login log (IP, user agent, success/fail) for all users
   - Secure file upload (type/size checks) for product images
3. **Reliable:** central error handler, structured logging (pino), request IDs, `/health` and `/ready` endpoints, graceful shutdown, DB connection retry, MySQL transactions for checkout, stock decrement that is **atomic** (no overselling), timeouts, and pagination everywhere.
4. **UI must be light, clean and user-friendly, not heavy or cluttered:**
   - Mobile-first, fast, minimal. Plenty of white space, one primary colour (green/yellow accent is fine), max 2 fonts (system or one web font)
   - No heavy animations, no giant libraries, no autoplay carousels. Lazy-load routes and images, skeleton loaders instead of spinners
   - Large tap targets, clear error messages, accessible (labels, focus states, contrast, keyboard navigation)
   - Target Lighthouse Performance 90+ and Accessibility 90+ on the home page
5. **Clean code:** monorepo with `client/` and `server/`, feature-based folder structure, ESLint + Prettier, small functions, comments only where needed, conventional commits.
6. **Scope control:** do not add features I did not ask for. If something is ambiguous, ask me one short question and proceed with a sensible default if I do not answer.

## CORE FEATURES
**Customer:** sign up / login / logout, forgot password (email OTP or link), pincode serviceability check, browse categories, product listing with search, filters and sort, product details, cart, address book, checkout (Razorpay + COD), order placement, order tracking (status timeline: Placed, Packed, Out for delivery, Delivered, Cancelled), order history, profile.

**Admin:** dashboard (orders today, revenue, low stock), product CRUD with image upload, category CRUD, inventory/stock updates, order management with status changes, customer list (view/block), coupons (simple percentage/flat), banner management, audit log viewer.

## HOW YOU MUST WORK (STRICT PROCESS RULES)
- Work **one phase at a time**, in order. Never start the next phase on your own.
- At the **end of every phase**:
  1. Run that phase's checks (lint, build, tests, and a manual smoke test where relevant) and fix failures.
  2. Create `docs/phases/PHASE_<N>_<NAME>.md` containing: **Goal, What was done, Files created/changed, Commands to run/verify, Decisions and why, Issues faced and fixes, Security notes, What is next**.
  3. Commit to git with a clear message (`git tag phase-<N>-complete`).
  4. **STOP and tell me:** "Phase N complete. Review `docs/phases/...md`. Reply `continue` to start Phase N+1."
  5. Wait for my reply before doing anything else.
- If a command fails, show the error, explain it in simple words, fix it, and continue within the same phase.
- Never hardcode passwords. When a DB password is needed, generate a strong one, place it in the git-ignored `.env`, and tell me where it is.

---

# PHASES

## PHASE 0: Laptop setup (Windows, using winget)
Goal: install every tool needed. Use PowerShell. First verify winget works (`winget --version`). Run PowerShell as Administrator where required.

For **each** package: run `winget search <name>` and `winget show --id <id> --versions` to find the latest **stable/LTS** version, then install with an **explicit pinned version** (`--version x.y.z`), `--exact`, and `--accept-package-agreements --accept-source-agreements`. Pin to these major lines:

| Tool | winget ID | Pin to |
|---|---|---|
| Git | `Git.Git` | latest stable |
| Node.js | `OpenJS.NodeJS.LTS` | latest **LTS** (even-numbered major) |
| MySQL Server | `Oracle.MySQL` | **8.4.x LTS** |
| MySQL Workbench | `Oracle.MySQLWorkbench` | latest stable |
| MongoDB Server | `MongoDB.Server` | **8.0.x** |
| MongoDB Shell | `MongoDB.Shell` | latest stable |
| MongoDB Compass | `MongoDB.Compass.Full` | latest stable |
| Docker Desktop | `Docker.DockerDesktop` | latest stable (needs WSL2) |
| VS Code (optional) | `Microsoft.VisualStudioCode` | latest stable |
| Postman or Bruno | `Postman.Postman` or `Bruno.Bruno` | latest stable |

Steps:
1. Install all tools above one by one. Handle reboots/WSL2 setup for Docker if needed and tell me when I must restart.
2. Make sure MySQL and MongoDB run as **Windows services** and start automatically. Configure the MySQL root password securely, then create an app-specific DB user (not root) with limited privileges. Create the DBs `quickcart_dev` (MySQL) and `quickcart_dev` (MongoDB).
3. Install global tools: `npm i -g pnpm` (or stay with npm, decide and document), `npm i -g prisma` is NOT needed (use via npx).
4. Verify and print versions: `git --version`, `node -v`, `npm -v`, `mysql --version`, `mongod --version`, `mongosh --version`, `docker --version`. Test real connections to both databases.
5. Configure git (`user.name`, `user.email`: ask me), set `core.autocrlf` appropriately for Windows.
6. Write `docs/phases/PHASE_0_SETUP.md` including an exact table of installed tools and versions, plus a troubleshooting section (PATH issues, service not starting, port conflicts 3306/27017/5000/5173).
7. Create `scripts/setup-windows.ps1` that reproduces Phase 0 so I can repeat it on another machine.

**STOP after Phase 0.**

## PHASE 1: Project scaffold and tooling
- Create monorepo `quickcart/` with `client/`, `server/`, `docs/`, `scripts/`, `docker/`.
- Initialise git, `.gitignore`, `.editorconfig`, ESLint, Prettier, Husky + lint-staged, commit lint.
- Server: Express app skeleton (app.js vs server.js separation), env validation, pino logger, error handler, `/health`, `/ready`, versioned router, graceful shutdown.
- Client: Vite + React + Tailwind + router skeleton with a lazy-loaded layout.
- Root scripts: `npm run dev` (runs client and server together), `build`, `lint`, `test`.
- Write a proper `README.md` (local run steps for Windows).
- Doc: `PHASE_1_SCAFFOLD.md`. **STOP.**

## PHASE 2: Database design and data layer
- **MySQL (Prisma schema + migrations):** `users`, `roles`, `addresses`, `refresh_tokens`, `login_logs`, `audit_logs`, `orders`, `order_items`, `payments`, `coupons`, `coupon_usages`. Proper types (DECIMAL for money, never float), foreign keys, indexes, soft delete where useful, `created_at/updated_at`.
- **MongoDB (Mongoose):** `categories`, `products` (variants/weights, price, MRP, stock, images, tags, text index), `carts`, `banners`, `reviews`. Add indexes for search and listing.
- Seed scripts: 1 super admin (password from env), 8 categories, 60+ realistic grocery products, sample banners and coupons. Idempotent seed.
- Provide an ER diagram (Mermaid) in docs.
- Doc: `PHASE_2_DATABASE.md` including data-split rationale. **STOP.**

## PHASE 3: Authentication and security core
- Register, login, logout, refresh (rotation + reuse detection), forgot/reset password, change password, email verification (stub email service with a real SMTP option via env; use Mailpit/console in dev).
- Auth middleware, RBAC middleware, rate limiters, account lockout, login logging, audit logging helper.
- Helmet, CORS allowlist, HPP, sanitizers, CSRF strategy for the cookie flow (document it).
- Tests for every auth flow, including attack cases (brute force, token reuse, role escalation attempts).
- Doc: `PHASE_3_AUTH_SECURITY.md` with a threat-model table. **STOP.**

## PHASE 4: Catalog APIs
- Public: categories, product list (pagination, filters, sort, price range), product detail, search with autocomplete (Mongo text index, debounced-friendly), home feed (banners + category sections), pincode serviceability.
- Caching headers / in-memory cache for hot reads (design so Redis can be added later).
- Validation, tests, OpenAPI/Swagger docs at `/api/docs` (disabled or protected in production).
- Doc: `PHASE_4_CATALOG.md`. **STOP.**

## PHASE 5: Cart, checkout, orders, payments
- Cart (guest cart in client, merged into server cart on login), address CRUD, coupon apply/validate.
- Checkout: server recomputes all prices (never trust the client), **atomic stock reservation**, MySQL transaction to create order + items + payment record, idempotency key.
- Razorpay order creation + verify signature + webhook with signature check; COD flow; failed/abandoned payment handling and stock release job.
- Order status state machine (only valid transitions), cancellation rules, order history and tracking endpoints.
- Tests including concurrency test (two users buying the last item).
- Doc: `PHASE_5_ORDERS_PAYMENTS.md`. **STOP.**

## PHASE 6: Admin APIs
- Dashboard stats, product/category CRUD, image upload (validated, resized, stored locally in dev and S3-compatible/Cloudinary in prod via env switch), stock update, order management, customer management (block/unblock), coupons, banners, audit log listing.
- Every route admin-only, validated, audited.
- Tests. Doc: `PHASE_6_ADMIN_API.md`. **STOP.**

## PHASE 7: Frontend foundation and design system
- Tailwind theme tokens, small reusable component set (Button, Input, Card, Modal, Toast, Skeleton, Badge, EmptyState), layout (header with search and cart, bottom nav on mobile, footer).
- API client with interceptors (silent refresh), TanStack Query setup, auth store, protected routes, error boundary, 404 page.
- Keep bundle small. Document the design rules (spacing, colours, typography).
- Doc: `PHASE_7_FRONTEND_FOUNDATION.md`. **STOP.**

## PHASE 8: Customer UI
- Home, category page, product listing (infinite scroll or "Load more"), search with suggestions, product detail, cart drawer, address picker, checkout, payment, order success, orders list, order tracking, profile, auth pages.
- Add-to-cart with quantity stepper like Blinkit, optimistic updates, clear empty/error/loading states, responsive on 360px up to desktop.
- Doc: `PHASE_8_CUSTOMER_UI.md` with screenshots if possible. **STOP.**

## PHASE 9: Admin UI
- Separate `/admin` area (lazy-loaded, not in the customer bundle): dashboard, products (table + form), categories, orders (filter + status update), customers, coupons, banners, audit logs.
- Simple tables with pagination, search and confirm dialogs. Keep it light.
- Doc: `PHASE_9_ADMIN_UI.md`. **STOP.**

## PHASE 10: Hardening and performance
- Run `npm audit`, fix vulnerabilities, add Dependabot config.
- Security review checklist against OWASP Top 10 (document pass/fail for each).
- Performance: DB query review and indexes, image optimisation, compression, code-splitting, Lighthouse run, fix issues.
- Observability: structured logs, error tracking hook (Sentry optional via env), log rotation guidance.
- Backups: documented MySQL dump and MongoDB dump scripts plus restore test.
- Doc: `PHASE_10_HARDENING.md`. **STOP.**

## PHASE 11: Full testing
- Unit, integration, and **Playwright end-to-end** (signup, browse, add to cart, checkout COD, admin creates product and updates order).
- Load test the key endpoints (k6 or autocannon) and record results.
- Coverage report. Fix every failure.
- Doc: `PHASE_11_TESTING.md` with test matrix, coverage numbers, known limitations. **STOP.**

## PHASE 12: Production setup and deployment
- Multi-stage Dockerfiles for client and server, `docker-compose.yml` (dev) and `docker-compose.prod.yml` (app, nginx, mysql, mongo with volumes, healthchecks, restart policies, non-root users).
- Nginx config: HTTPS, gzip/brotli, caching for static assets, security headers, reverse proxy to API.
- GitHub Actions CI: lint, test, build, security scan, and optional deploy job.
- Production env checklist (secrets, managed DB options such as MongoDB Atlas and managed MySQL, domain, SSL via Let's Encrypt), zero-downtime-friendly migration process (`prisma migrate deploy`), rollback steps.
- Provide `docs/DEPLOYMENT.md` with step-by-step deployment for a VPS and one managed option (Render/Railway).
- Doc: `PHASE_12_DEPLOYMENT.md`. **STOP.**

## PHASE 13 (FINAL): Application flow documentation
Only after all tests pass, create `docs/APPLICATION_FLOW.md` containing, with Mermaid diagrams:
1. System architecture (client, API, MySQL, MongoDB, Razorpay, storage, Nginx)
2. Authentication flow (login, refresh rotation, logout)
3. Customer journey (browse to delivery)
4. Checkout and payment sequence diagram (including webhook and stock handling)
5. Order status state machine
6. Admin workflow
7. Data flow: what is stored in MySQL vs MongoDB and why
8. Folder structure explanation
9. How to run locally, how to deploy, and how to debug common problems
10. Future improvements (Redis, delivery partner app, real-time tracking, notifications)

Also update `README.md` with a final summary. **STOP and give me a final report.**

---

## START NOW
Begin with **Phase 0 only**. Run the winget installs, verify everything, write the Phase 0 `.md`, then stop and wait for me to say `continue`.
This application is name should be 'Zippy'.