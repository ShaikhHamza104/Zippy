# Phase 1: Project Scaffold and Tooling

## Goal

Establish a clean, scalable monorepo structure for **Zippy** using pnpm workspaces, set up automated developer tooling (ESLint, Prettier, Husky, Commitlint, Vitest), build a modular Express.js backend API skeleton with strict runtime environment validation, security middlewares, structured Pino logging, and graceful shutdown, and implement a responsive, mobile-first Vite + React 18 + Tailwind CSS client with lazy-loaded layout and components.

---

## What Was Done

1. **pnpm Monorepo Workspace Configuration:**
   - Initialized root `package.json` and `pnpm-workspace.yaml` declaring `@zippy/server` and `@zippy/client`.
   - Configured root-level orchestration scripts: `pnpm dev` (concurrent execution), `pnpm build`, `pnpm lint`, and `pnpm test`.
   - Configured `.editorconfig`, `.prettierrc`, `.prettierignore`, `.lintstagedrc.json`, and `commitlint.config.js`.
   - Configured Husky git hooks for automated `pre-commit` lint-staged and `commit-msg` conventional commit validation.
2. **Backend Server Architecture (`server/`):**
   - **Separation of Concerns:** Separated `app.js` (Express configuration, middlewares, routes, error handling) from `server.js` (HTTP lifecycle and graceful shutdown).
   - **Fail-Fast Environment Validation:** Authored `src/config/env.js` leveraging Zod to validate all required environment variables at process startup.
   - **Structured Logging:** Authored `src/config/logger.js` utilizing Pino with request ID tracing, development pretty-printing, and redaction for sensitive keys (passwords, tokens, payment data, auth headers).
   - **Security Middlewares:** Integrated Helmet for secure HTTP headers, CORS with origin allowlists, HPP parameter pollution protection, and payload size constraints (`10kb`).
   - **Centralized Error Handling:** Built standardized `notFoundHandler` (404) and `errorHandler` (500) preventing sensitive stack trace leaks in production.
   - **Health & Versioning:** Implemented `/health` (liveness), `/ready` (readiness), and `/api/v1` versioned base routes.
   - **Automated Testing:** Implemented Vitest + Supertest suite validating `/health`, `/ready`, `/api/v1`, and 404 responses.
3. **Frontend Client Architecture (`client/`):**
   - Initialized Vite + React 18 with Tailwind CSS, React Router v6, TanStack Query, and Zustand.
   - Designed a mobile-first, Blinkit-style header with branding, 10-minute delivery badge, delivery location selector, search bar, and cart drawer button.
   - Implemented `BottomNav` for mobile screens and comprehensive `Footer` with service value propositions.
   - Configured `RootLayout` with code-split lazy-loading and accessible `Skeleton` loading states via React Suspense.
   - Built `HomePage` featuring hero delivery banner, category shortcuts, and service highlights.
   - Built custom `NotFoundPage` (404).
   - Implemented automated Vitest + React Testing Library component tests.
4. **DevOps & Verification:**
   - Scaffolded `docker/docker-compose.dev.yml` for containerized dev orchestration.
   - Executed live smoke testing against background Express server verifying real-time HTTP responses for `/health`, `/ready`, and `/api/v1`.
   - Wrote comprehensive `README.md` detailing Windows setup and execution workflows.

---

## Files Created / Changed

- `package.json` - Root monorepo script coordinator and dev dependencies.
- `pnpm-workspace.yaml` - Monorepo package mapping (`client`, `server`) and build script approvals.
- `.editorconfig` - Formatting rules across IDEs.
- `.prettierrc` & `.prettierignore` - Code formatting rules and exclusions.
- `commitlint.config.js` - Conventional commit rules.
- `.lintstagedrc.json` - Pre-commit formatting automation.
- `.husky/pre-commit` & `.husky/commit-msg` - Active Git hooks.
- `README.md` - Complete project setup, run, and diagnostic documentation.
- `docker/README.md` & `docker/docker-compose.dev.yml` - Docker compose scaffold.
- `server/package.json` - Server dependencies and scripts.
- `server/eslint.config.js` & `server/vitest.config.js` - Server linting and test configs.
- `server/src/app.js` - Express application definition and middleware stack.
- `server/src/server.js` - Server listener and graceful shutdown lifecycle.
- `server/src/config/env.js` - Zod environment variable validation schema.
- `server/src/config/logger.js` - Pino logger with sensitive field redaction.
- `server/src/middleware/requestId.js` - Request ID injector (`x-request-id`).
- `server/src/middleware/errorHandler.js` - Centralized JSON error response handler.
- `server/src/middleware/notFoundHandler.js` - 404 Not Found JSON handler.
- `server/src/routes/health.routes.js` - `/health` and `/ready` endpoints.
- `server/src/routes/v1/index.js` - `/api/v1` versioned router.
- `server/tests/health.test.js` - Server integration test suite.
- `client/package.json` - Client dependencies and scripts.
- `client/vite.config.js` - Vite bundler and API proxy configuration.
- `client/tailwind.config.js` & `client/postcss.config.js` - Tailwind design tokens.
- `client/eslint.config.js` & `client/vitest.config.js` - Client linting and test configs.
- `client/index.html` - HTML5 template with viewport and metadata.
- `client/src/index.css` - Global CSS styles and Tailwind layers.
- `client/src/main.jsx` - Client application bootstrapping.
- `client/src/App.jsx` - Root application component with QueryClient and Router.
- `client/src/router.jsx` - Lazy-loaded client routing table.
- `client/src/layouts/RootLayout.jsx` - Code-split root layout with Suspense fallback.
- `client/src/components/common/Header.jsx` - Blinkit-style top header.
- `client/src/components/common/BottomNav.jsx` - Mobile bottom navigation.
- `client/src/components/common/Footer.jsx` - Footer with service guarantees.
- `client/src/components/common/Skeleton.jsx` - Reusable skeleton loader.
- `client/src/pages/HomePage.jsx` - Quick-commerce landing view.
- `client/src/pages/NotFoundPage.jsx` - 404 fallback page.
- `client/tests/setup.js` & `client/tests/App.test.jsx` - Client UI test suite.
- `docs/phases/PHASE_1_SCAFFOLD.md` - Phase 1 documentation and records.

---

## Commands to Run and Verify

Refresh the environment PATH in PowerShell before running checks:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 1. Run Monorepo Linting

```powershell
pnpm run lint
```

_Expected: 0 errors and 0 warnings across all workspace packages._

### 2. Run All Automated Test Suites

```powershell
pnpm run test
```

_Expected: All 6 tests pass across `@zippy/server` (4 tests) and `@zippy/client` (2 tests)._

### 3. Build Production Bundles

```powershell
pnpm run build
```

_Expected: Vite builds client production assets cleanly into `client/dist/` with code-split chunks._

### 4. Background Server Smoke Test

```powershell
# Start server in background
$proc = Start-Process node -ArgumentList "src/server.js" -WorkingDirectory "d:\Zippy\server" -PassThru

# Test health check
Invoke-RestMethod -Uri "http://localhost:5000/health"

# Stop server process
Stop-Process -Id $proc.Id -Force
```

---

## Decisions and Why

1. **Native `node --watch` over Nodemon:**
   - Node.js 24 LTS provides native, robust file-watching (`node --watch src/server.js`), removing unnecessary external dependencies and faster hot reloads on Windows.
2. **App.js vs. Server.js Separation:**
   - Decoupling Express app configuration from `server.listen()` allows Supertest to import `app` directly for integration tests without binding to a physical network port.
3. **Pino with Sensitive Field Redaction:**
   - Pino is significantly faster than Winston. Strict redaction prevents accidental exposure of authentication headers, tokens, and passwords in logs.
4. **Vite Code-Splitting and Lazy-Loading:**
   - All layout and page components are dynamically imported with `React.lazy()` and wrapped in `Suspense`, ensuring the initial JavaScript bundle remains lightweight and Lighthouse performance targets (90+) are maintained.
5. **Fail-Fast Configuration Pattern:**
   - If critical environment variables are absent, the application terminates immediately at startup with explicit error diagnostics, rather than failing silently during request handling.

---

## Issues Faced and Fixes

1. **pnpm v12 Build Script Restrictions (`ERR_PNPM_IGNORED_BUILDS`):**
   - _Issue:_ pnpm v12 enforces an explicit build approval policy for packages executing native postinstall scripts (e.g., `esbuild`).
   - _Fix:_ Configured `onlyBuiltDependencies` in `pnpm-workspace.yaml` and executed `pnpm approve-builds --all`.
2. **ESLint 9 JSX Identifier Resolution:**
   - _Issue:_ ESLint 9 standard `no-unused-vars` flagged JSX components as unused in JSX expressions.
   - _Fix:_ Configured `react/jsx-uses-vars` and `react/jsx-uses-react` rules in `client/eslint.config.js`.

---

## Security Notes

1. **Zero Secrets in Repository:**
   - All sensitive database and server configurations are sourced from `.env` which is excluded via `.gitignore` and verified by `git check-ignore`.
   - `.env.example` provides non-sensitive template defaults.
2. **Hardened HTTP Defenses:**
   - Helmet sets HTTP security headers (CSP, HSTS, X-Content-Type-Options, etc.).
   - Body parsers enforce a strict `10kb` limit to prevent denial-of-service payload attacks.
   - HPP guards against parameter pollution exploits.
3. **Traceability:**
   - Unique UUID `x-request-id` headers are generated for every incoming request and attached to logs and error responses.

---

## What is Next

Proceed to **Phase 2: Database design and data layer**:

- Design MySQL schema using Prisma ORM (`users`, `roles`, `addresses`, `refresh_tokens`, `login_logs`, `audit_logs`, `orders`, `order_items`, `payments`, `coupons`).
- Design MongoDB schemas using Mongoose (`categories`, `products`, `inventory/stock`, `carts`, `banners`, `reviews`).
- Generate and apply initial Prisma migrations to `zippy_dev`.
- Develop idempotent seed scripts (1 super admin, 8 categories, 60+ realistic grocery products, sample banners and coupons).
- Create Mermaid ER diagrams and document the data-split architecture.
