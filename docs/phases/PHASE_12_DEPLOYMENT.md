# Phase 12: Production Setup and Deployment

> **Status:** Complete  
> **Environment:** Docker Engine v24+, Docker Compose v2.20+, Node.js v24 LTS (v24.20.0), pnpm 12, Nginx Alpine, GitHub Actions  
> **Date:** October 2026  
> **Scope:** Multi-Stage Dockerfiles, Production Docker Compose, Nginx Reverse Proxy with TLS/Caching, GitHub Actions CI/CD Pipeline, Environment Templates, and Deployment Runbooks.

---

## 1. Goal

Prepare the Zippy quick-commerce application for production readiness and deployment by:

1. Creating hardened multi-stage Dockerfiles for both `@zippy/server` and `@zippy/client` running as unprivileged non-root users (`USER node` and `USER nginx`).
2. Setting up local (`docker-compose.yml`) and production (`docker-compose.prod.yml`) orchestration stacks with persistent volumes, resource quotas, healthchecks, and internal bridge networking.
3. Writing a production Nginx configuration featuring gzip compression, 1-year immutable caching for Vite assets, strict security headers, and an API/uploads reverse proxy.
4. Providing all three required environment templates (`.env.example`, `.env.development`, `.env.production.example`) with zero exposed real secrets.
5. Implementing a complete GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) covering linting, security audits, database-containerized integration testing, build verification, and deployment hooks.
6. Authoring comprehensive deployment documentation in `docs/DEPLOYMENT.md`.

---

## 2. What Was Done

### 2.1 Multi-Stage Dockerfiles & Image Hardening

- **Backend (`server/Dockerfile`):**
  - **Stage 1 (`builder`):** Installs build tools, activates `pnpm`, installs dependencies, generates Prisma client, copies source code, and uses `pnpm deploy --prod` to produce a pruned production distribution.
  - **Stage 2 (`runner`):** Built on `node:24-alpine`, configures `NODE_ENV=production`, creates an `/app/uploads` volume with ownership assigned to the system non-root `node` user, drops privileges (`USER node`), exposes port `5000`, and sets up an automated healthcheck.
- **Frontend (`client/Dockerfile`):**
  - **Stage 1 (`builder`):** Installs client dependencies and compiles an optimized Vite SPA bundle into `/app/client/dist`.
  - **Stage 2 (`runner`):** Built on `nginx:alpine`, uses `libcap` to grant `cap_net_bind_service=+ep` to the `nginx` binary, sets ownership of pid/cache/log directories to user `nginx`, drops privileges (`USER nginx`), serves static assets, and exposes ports `80` and `443`.
- **Docker Ignore Files:** Configured `.dockerignore`, `server/.dockerignore`, and `client/.dockerignore` to eliminate source leaks (`.git`, `.env*`, `coverage`, `logs`, `playwright-report`).

### 2.2 Docker Compose Orchestration

- **`docker-compose.yml` (Development):** Local development stack linking `mysql` (8.4), `mongodb` (8.0), `server`, and `client` on the `zippy-dev-net` bridge network with volume mounts and automated healthchecks.
- **`docker-compose.prod.yml` (Production Stack):**
  - All 4 core services (`mysql`, `mongodb`, `server`, `client`).
  - CPU and memory resource quotas (e.g. `cpus: '2.0'`, `memory: 1024M` on backend).
  - Restart policies set to `unless-stopped`.
  - Service health dependencies (`depends_on: { service: { condition: service_healthy } }`).
  - Named persistent volumes: `zippy_mysql_prod_data`, `zippy_mongo_prod_data`, `zippy_prod_uploads`, `zippy_nginx_certs`, and `zippy_certbot_www`.
  - Fully isolated internal bridge network `zippy_internal_network`.

### 2.3 Hardened Nginx Reverse Proxy

- **Gzip Compression:** Enabled across text, JSON, SVG, CSS, JS, and font MIME types with level 6 compression.
- **Immutable Asset Caching:** Set 1-year public caching (`Cache-Control: public, max-age=31536000, immutable`) for hashed Vite static assets (`/assets/*`).
- **Cache Invalidation for SPA:** HTML document (`index.html`) delivered with `no-cache, no-store, must-revalidate` to ensure client updates propagate without stale cache locks.
- **Reverse Proxy Routing:**
  - Reverse proxy for REST endpoints (`/api/`) forwarding to `http://backend_upstream` with connection pooling, keepalive (32), request ID passing, and WebSocket support.
  - Reverse proxy for image uploads (`/uploads/`) with 30-day client cache.
  - Reverse proxy for `/health` checks.
- **Security Headers:** Embedded `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **SSL / TLS Readiness:** Built-in ACME challenge support (`/.well-known/acme-challenge/`) for Certbot webroot automation and a commented HTTPS port 443 server template ready for deployment.

### 2.4 Environment Configuration Files

- Created `.env.example`, `.env.development`, and `.env.production.example`.
- Verified non-negotiable requirement #1: works in local and production, all config driven by environment variables, validated at boot by Zod, with zero committed secrets.

### 2.5 GitHub Actions CI/CD Pipeline

- Automated workflow `.github/workflows/ci.yml` running on pull requests, pushes to `main`, and manual dispatch (`workflow_dispatch`).
- **5 Orchestrated Jobs:**
  1. `lint`: Monorepo ESLint check.
  2. `security-audit`: `pnpm audit --prod --audit-level=high` supply-chain vulnerability scan.
  3. `test`: MySQL 8.4 and MongoDB 8.0 service containers, automatic Prisma migration deployment (`prisma:deploy`), and full Vitest suite execution (`pnpm test`).
  4. `build`: Client asset compilation verification.
  5. `deploy`: Deployment release job executing conditionally on `main` branch with environment gating.

---

## 3. Files Created / Modified

| File                                 | Purpose                                                                  |
| :----------------------------------- | :----------------------------------------------------------------------- |
| `server/Dockerfile`                  | Production multi-stage Dockerfile for Node.js API (non-root `USER node`) |
| `client/Dockerfile`                  | Production multi-stage Dockerfile for React SPA (non-root `USER nginx`)  |
| `.dockerignore`                      | Root build context exclusions                                            |
| `server/.dockerignore`               | Backend build context exclusions                                         |
| `client/.dockerignore`               | Frontend build context exclusions                                        |
| `docker-compose.yml`                 | Local development Docker Compose stack                                   |
| `docker-compose.prod.yml`            | Hardened production Docker Compose stack                                 |
| `docker/nginx/nginx.conf`            | High-performance Nginx main configuration                                |
| `docker/nginx/default.conf`          | Nginx virtual host with reverse proxy, caching, and SSL template         |
| `.env.example`                       | Master template with safe placeholders and comments                      |
| `.env.development`                   | Development configuration with local mock defaults                       |
| `.env.production.example`            | Production environment template with security guidelines                 |
| `.github/workflows/ci.yml`           | GitHub Actions CI/CD automated pipeline                                  |
| `docs/DEPLOYMENT.md`                 | Comprehensive production deployment runbook                              |
| `docs/phases/PHASE_12_DEPLOYMENT.md` | Phase 12 execution documentation and audit report                        |

---

## 4. Commands to Run & Verify

```bash
# 1. Validate Docker Compose Configurations
docker compose -f docker-compose.yml config
docker compose -f docker-compose.prod.yml config

# 2. Run Monorepo Code Quality Checks
pnpm lint

# 3. Execute Full Unit and Integration Test Suite
pnpm test

# 4. Verify Frontend Production Asset Compilation
pnpm build

# 5. Build Production Containers Locally (Optional)
docker compose -f docker-compose.prod.yml build
```

---

## 5. Architectural Decisions & Rationale

1. **Non-Root Container Hardening (`USER node` & `USER nginx`):**  
   _Decision:_ Containers run strictly as unprivileged users. On Alpine Nginx, `setcap` grants network binding capabilities without giving root execution rights.  
   _Rationale:_ Eliminates container breakout vulnerabilities (CWE-250) and aligns with modern Kubernetes and CIS Docker Benchmark standards.

2. **Immutable Static Cache vs No-Cache HTML:**  
   _Decision:_ Vite bundles hashed filenames (`assets/index-BE6ZBXrX.css`), cached for 1 year (`immutable`). `index.html` is served with `no-cache, no-store`.  
   _Rationale:_ Browsers download changed CSS/JS assets instantly upon a new deployment without users needing to hard-refresh or clear browser cache.

3. **In-Pipeline Database Containers in GitHub Actions:**  
   _Decision:_ The CI `test` job provisions official MySQL 8.4 and MongoDB 8.0 service containers with healthchecks.  
   _Rationale:_ Guarantees integration tests execute against the exact database engines used in production, catching SQL syntax differences and MongoDB index behavior before deployment.

4. **Expand-and-Contract Migration Policy:**  
   _Decision:_ Schema migrations are pre-executed via `prisma migrate deploy` prior to updating application containers, requiring backward-compatible DDL.  
   _Rationale:_ Prevents downtime and race conditions during blue-green and rolling container restarts.

---

## 6. Environment Limitations & Notes from Phase 11

1. **In-Memory Rate Limiting in Multi-Instance Deployments:**  
   As observed during Phase 10 & 11 testing, `express-rate-limit` uses in-memory tracking by default. When deploying horizontally across multiple server containers or load-balanced VPS nodes, rate limit counters are local to each container. For multi-replica production clusters, configure a shared Redis store via `rate-limit-redis`.
2. **Razorpay Development vs Live Webhook Signatures:**  
   In development and testing environments, Razorpay operates in simulated test mode. In production, ensure `RAZORPAY_WEBHOOK_SECRET` matches the secret registered in the Razorpay Dashboard to validate SHA256 HMAC webhook payloads.
3. **Local Disk Storage vs S3 Multi-Instance:**  
   The `local` media storage provider saves product images to `/app/uploads` (mounted via Docker volume `zippy_prod_uploads`). When scaling horizontally across multiple physical hosts, set `STORAGE_PROVIDER=s3` or `STORAGE_PROVIDER=cloudinary` to ensure uploaded images are globally accessible.

---

## 7. Security Notes

- **Zero Secrets Committed:** All secrets are parameterized via environment variables. All committed `.env.*` files contain safe placeholders only.
- **Security Headers Active:** Strict HTTP response headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`) applied on all responses via Nginx.
- **Resource Limits:** Docker Compose sets hard CPU (2.0 cores max) and memory limits (1024MB max) to protect host systems from resource exhaustion and Denial of Service (DoS).

---

## 8. What Is Next

Phase 12 is fully complete.  
The next and final phase is **PHASE 13 (FINAL): Application flow documentation** — creating `docs/APPLICATION_FLOW.md` with complete Mermaid diagrams (architecture, authentication, customer journey, checkout sequence, state machines, admin workflows, data flow), and updating `README.md` with a final project summary.
