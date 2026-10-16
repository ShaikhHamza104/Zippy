# Zippy ⚡

A high-performance, production-ready quick-commerce grocery web application (inspired by Blinkit & Zepto), built with a modern MERN + MySQL transactional stack.

---

## 🏗️ Architecture & Tech Stack

### Monorepo Structure

```text
zippy/
├── client/          # React 18 + Vite + Tailwind CSS + TanStack Query + Zustand
├── server/          # Node.js LTS + Express.js REST API (/api/v1) + Pino
├── docker/          # Docker Compose configurations
├── docs/            # Phase-by-phase architectural & operational documentation
│   └── phases/      # Individual phase documentation and verification logs
└── scripts/         # Windows setup and maintenance automation scripts
```

### Dual-Database Design Rationale

- **MySQL 8.4 LTS (via Prisma ORM):** Handles relational, strictly transactional data requiring ACID guarantees — Users, RBAC roles, addresses, refresh tokens, audit logs, orders, order items, and payment transactions.
- **MongoDB 8.0 (via Mongoose):** Handles high-throughput catalog reads and unstructured data — Products, categories, inventory stock, carts, promotional banners, and reviews.

---

## 🚀 Getting Started (Windows)

### Prerequisites

Ensure Phase 0 setup has been performed. Required tools:

- Node.js **24.x LTS** (`node -v`)
- pnpm **12.x** (`pnpm -v`)
- MySQL Server **8.4 LTS** running as Windows service (`Get-Service MySQL84`)
- MongoDB Server **8.0** running as Windows service (`Get-Service MongoDB`)

### 1. Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```powershell
Copy-Item .env.example .env
```

Fill in the database credentials for your local MySQL `zippy_user` and MongoDB instance. Secrets in `.env` are automatically excluded from Git.

### 2. Install Monorepo Dependencies

From the repository root:

```powershell
pnpm install
```

### 3. Run Development Servers

To run both the Express backend API and the Vite frontend concurrently:

```powershell
pnpm dev
```

Alternatively, run them individually:

```powershell
# Backend API only (runs on http://localhost:5000 with --watch)
pnpm dev:server

# Frontend client only (runs on http://localhost:5173)
pnpm dev:client
```

---

## 🧪 Testing, Linting & Building

| Command      | Action                                           |
| ------------ | ------------------------------------------------ |
| `pnpm test`  | Runs all Vitest suites across client and server  |
| `pnpm lint`  | Runs ESLint across all workspace packages        |
| `pnpm build` | Compiles the production frontend bundle via Vite |

---

## 🩺 Diagnostic Endpoints

The backend server exposes standardized health and readiness check routes:

- `GET http://localhost:5000/health`: Liveness probe (`status`, `uptime`, `timestamp`)
- `GET http://localhost:5000/ready`: Readiness probe verifying system status
- `GET http://localhost:5000/api/v1`: Root versioned API metadata

---

## 🔒 Code Standards & Git Workflow

- **Formatting:** Managed automatically via Prettier (`.prettierrc`).
- **Code Quality:** Enforced via ESLint flat configs (`eslint.config.js`).
- **Git Hooks:** Husky pre-commit runs `lint-staged`.
- **Commit Messages:** Enforced conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
