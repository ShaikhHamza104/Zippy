# Zippy Cloud Deployment: Step-by-Step Beginner Guide

This guide walks you through deploying **Zippy** to the internet using the **cheapest, production-grade setup for students**:

- **Backend API**: Render Web Service (Free Tier, $0/month)
- **Frontend SPA**: Render Static Site or Vercel (Free Tier, $0/month)
- **Relational DB (MySQL)**: TiDB Serverless (Free Forever, $0/month)
- **Document DB (MongoDB)**: MongoDB Atlas M0 (Free Forever, $0/month)
- **Total Cost**: **$0.00 / month** (No credit card required)

---

## 1. Hosting Architecture & Database Options Comparison

Zippy requires two databases:

1. **MySQL 8.0+** (Auth, Users, Addresses, Orders, Order Items, Payments, Coupons, Audit Logs) managed via Prisma ORM.
2. **MongoDB 7.0+** (Categories, Products, Inventory, Carts, Reviews, Banners) managed via Mongoose ODM.

### Comparison of Free / Low-Cost MySQL-Compatible Hosts

| Provider                      | Free Tier Specs & Limits                                                                                                                            | Protocol Compatibility                                         | Credit Card Required? | Recommendation                                                                                        |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- | :-------------------- | :---------------------------------------------------------------------------------------------------- |
| **TiDB Serverless (PingCAP)** | **5 GiB** row storage, **50M Request Units (RU)** per month free forever. Auto-scaling, up to 400 connections, automated backups, TLS/SSL enforced. | **100% MySQL 8.0 wire-compatible**. Direct drop-in for Prisma. | **NO**                | **RECOMMENDED**. Outstanding performance, high limits, no idle shutdown, never expires.               |
| **Aiven for MySQL**           | 1 Node, 1 GB RAM, 1 GB storage. Fully managed MySQL 8.0.                                                                                            | Native MySQL 8.0.                                              | **NO**                | Viable alternative, but strict 1 GB storage limit and instances may sleep after prolonged inactivity. |
| **Clever Cloud (DEV Plan)**   | Shared MySQL instance, 10 MB - 256 MB storage depending on plan credits.                                                                            | Native MySQL.                                                  | **NO**                | Storage is very constrained; lacks automated multi-region replication.                                |

> **Selection**: **TiDB Serverless** is strongly recommended for Zippy. It provides generous storage (5 GiB), seamless MySQL 8.0 compatibility with Prisma, and never sleeps or drops cold connections unexpectedly.

---

## 2. Storage & Uploads on Free Ephemeral Hosts

> [!WARNING] Ephemeral Storage Warning
> Render free web services run in ephemeral Docker containers. Any files written to the local `/app/uploads` filesystem are wiped whenever the service redeploys or restarts.
>
> - **Catalog Products & Categories**: The pre-seeded catalog uses remote **Unsplash CDN URLs** (e.g. `https://images.unsplash.com/...`), so product images and category icons **persist seamlessly** across all redeployments and restarts.
> - **User Uploads**: The current codebase uses `STORAGE_PROVIDER=local` in `server/src/services/storage.service.js`. Remote object storage providers like Cloudinary or AWS S3 require external SDK integrations (`cloudinary` or `@aws-sdk/client-s3`), which are not currently installed. Setting `STORAGE_PROVIDER=cloudinary` or `s3` without an external storage bucket will fallback to base URLs without remote persistence.
> - **Recommendation**: For production environments requiring user photo uploads to persist across deploys, integrate an external cloud bucket (Cloudinary or AWS S3 free tier). For the student demo, all catalog browsing, search, carts, orders, and payments work out of the box with zero data loss.

---

## 3. Account Setup & Database Provisioning Checklist

### Step 3.1: Provision Free MySQL on TiDB Serverless

1. Navigate to [tidbcloud.com](https://tidbcloud.com) and click **Sign Up** (Sign in with GitHub or Google; no credit card required).
2. Click **Create Cluster**.
3. Choose **TiDB Serverless**.
4. Select your cluster region (e.g., AWS `ap-south-1` Mumbai or AWS `us-east-1` N. Virginia, whichever is closest to your Render service region).
5. Give the cluster a name, e.g., `zippy-db`.
6. Click **Create**.
7. In the cluster overview dashboard:
   - Click **Connect**.
   - Select **Connection Type**: **Prisma** or **General (MySQL Client)**.
   - Note the **Host**, **Port** (usually `4000`), **User**, and **Password**.
   - Ensure TLS/SSL is enabled. Your connection string will have the form:
     ```text
     mysql://<USERNAME>:<PASSWORD>@<HOST>:4000/<DATABASE_NAME>?sslaccept=strict
     ```
   - _Keep this connection string ready for Step 4. Never share or commit it._

### Step 3.2: Provision Free MongoDB on MongoDB Atlas

1. Navigate to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and click **Try Free**.
2. Sign up with Google or email (no credit card required).
3. Create a new project named `Zippy`.
4. Click **Create Deployment** and select the **M0 Free (Shared)** tier.
5. Choose cloud provider AWS and select a region matching your TiDB region (e.g., `ap-south-1` or `us-east-1`).
6. Set Cluster Name to `zippy-mongo` and click **Create Deployment**.
7. **Security Setup (Crucial)**:
   - **Database Access**: Click _Database Access_ -> _Add New Database User_. Use Built-in Role _Read and write to any database_. Set a secure username and password (avoid unencoded special characters like `@`, `:`, `/`).
   - **Network Access**: Click _Network Access_ -> _Add IP Address_. Enter `0.0.0.0/0` (Allow Access from Anywhere) and click Confirm. _(Render uses dynamic outbound IP addresses, so Atlas must allow global inbound connections authenticated with your credentials)._
8. **Get Connection String**:
   - Go to _Clusters_ -> _Connect_ -> _Drivers_ (Node.js).
   - Copy the SRV URI:
     ```text
     mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_HOST>/zippy_prod?retryWrites=true&w=majority&appName=zippy-mongo
     ```
   - _Keep this connection string ready for Step 4. Never share or commit it._

---

## 4. Database Migration & Seeding

Before running your backend API, deploy the Prisma schema and run the seed script to populate the hosted databases with categories, products, inventory, coupons, and administrative credentials.

From your local terminal, run the following commands (replace the placeholder URLs with your real hosted credentials for this one-time command execution):

### 4.1 Apply Prisma Migrations to Hosted MySQL

```bash
# In your local project root:
$env:DATABASE_URL="mysql://<USERNAME>:<PASSWORD>@<HOST>:4000/<DATABASE_NAME>?sslaccept=strict"
pnpm --filter @zippy/server prisma:deploy
```

_(On Linux/macOS bash, use `DATABASE_URL="..." pnpm --filter @zippy/server prisma:deploy`)_

Verify output confirms all migrations applied:

```text
Applying migration `20260301000000_init`
All migrations have been successfully applied.
```

### 4.2 Seed Hosted Databases (MySQL + MongoDB Atlas)

```bash
$env:DATABASE_URL="mysql://<USERNAME>:<PASSWORD>@<HOST>:4000/<DATABASE_NAME>?sslaccept=strict"
$env:MONGODB_URI="mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_HOST>/zippy_prod?retryWrites=true&w=majority"
$env:SUPER_ADMIN_EMAIL="admin@zippy.in"
$env:SUPER_ADMIN_PASSWORD="YourStrongAdminPassword123!"

pnpm --filter @zippy/server seed
```

Verify output confirms categories, products, coupons, inventory, and users have seeded successfully into both remote databases.

---

## 5. Backend Deployment (Render Web Service)

### Step 5.1: Create Web Service

1. Log in to [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository `Zippy`.
4. Configure the service:
   - **Name**: `zippy-api` (or custom name)
   - **Region**: Choose the region matching your database cluster (e.g., Singapore/Frankfurt/Oregon/Ohio).
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `server/Dockerfile`
   - **Docker Context**: `.` _(the repository root, essential for monorepo resolution)_
   - **Instance Type**: **Free**
   - **Health Check Path**: `/health`

### Step 5.2: Backend Environment Variables Checklist

In the Render dashboard, click **Environment** -> **Add Environment Variable**. Add each of the following variables:

| Variable Name             | Required Value / Description            | Example / Notes                                                                          |
| :------------------------ | :-------------------------------------- | :--------------------------------------------------------------------------------------- |
| `NODE_ENV`                | `production`                            | Enables production caching and security                                                  |
| `PORT`                    | `5000`                                  | Port exposed by server                                                                   |
| `DATABASE_URL`            | Hosted MySQL connection string with SSL | `mysql://user:pass@host:4000/zippy_prod?sslaccept=strict`                                |
| `MONGODB_URI`             | Hosted MongoDB Atlas connection string  | `mongodb+srv://user:pass@host/zippy_prod?retryWrites=true&w=majority`                    |
| `JWT_SECRET`              | 64+ random hex characters               | Generated via `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`            |
| `REFRESH_TOKEN_SECRET`    | 64+ random hex characters               | Separate secure random string                                                            |
| `CLIENT_URL`              | Your live frontend URL                  | `https://zippy-store.onrender.com` (or Vercel URL)                                       |
| `CORS_ORIGIN`             | Your live frontend URL                  | Same as `CLIENT_URL`                                                                     |
| `COOKIE_SECURE`           | `true`                                  | Enforces HTTPS-only cookies                                                              |
| `COOKIE_SAMESITE`         | `none`                                  | **CRITICAL for cross-domain cookies** (when frontend and backend have different domains) |
| `STORAGE_PROVIDER`        | `local`                                 | Uses `/app/uploads`                                                                      |
| `STORAGE_BASE_URL`        | Your live backend URL                   | `https://zippy-api.onrender.com`                                                         |
| `RAZORPAY_KEY_ID`         | Razorpay Key ID                         | Real test key `rzp_test_...` or simulated mode placeholder                               |
| `RAZORPAY_KEY_SECRET`     | Razorpay Key Secret                     | Corresponding secret                                                                     |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret                          | From Razorpay webhook dashboard                                                          |

5. Click **Create Web Service**.
6. Wait for the Docker build to complete. Verify logs show:
   ```text
   {"level":30,"msg":"Connected to MySQL via Prisma"}
   {"level":30,"msg":"Connected to MongoDB"}
   {"level":30,"msg":"Zippy API server running on port 5000"}
   ```
7. Test the health endpoint: `curl -f https://zippy-api.onrender.com/health`

---

## 6. Frontend Deployment (Render Static Site or Vercel)

### Option A: Render Static Site (Recommended for single dashboard)

1. In Render, click **New +** -> **Static Site**.
2. Connect your `Zippy` repository.
3. Configure the settings:
   - **Name**: `zippy-store`
   - **Branch**: `main`
   - **Root Directory**: leave blank (repo root)
   - **Build Command**: `pnpm --filter @zippy/client build`
   - **Publish Directory**: `client/dist`
4. **Environment Variables**:
   - `VITE_API_URL`: `https://zippy-api.onrender.com/api/v1`
5. **SPA Rewrite Rule (Crucial for client-side routing)**:
   - In Render dashboard, go to **Redirects/Rewrites**.
   - Add rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## 7. Cross-Domain Cookie & CORS Configuration

Because the frontend (`https://zippy-store.onrender.com`) and backend (`https://zippy-api.onrender.com`) are hosted on separate subdomains or domains:

1. **Browser Cookie Security**:
   - Browsers reject third-party/cross-origin cookies unless `SameSite=None` and `Secure=true`.
   - In the backend environment variables, ensure:
     ```text
     COOKIE_SECURE=true
     COOKIE_SAMESITE=none
     ```
   - Zippy's token utility (`server/src/utils/tokens.js`) automatically enforces `secure: true` when `sameSite: 'none'`.
2. **CORS Headers**:
   - The backend `server/src/app.js` automatically enables `credentials: true` and permits `CLIENT_URL` and `CORS_ORIGIN`.
   - The frontend `client/src/services/api.js` automatically sends `credentials: 'include'` with all fetch requests.

---

## 8. Post-Deployment Smoke Test Checklist

Once both services are active, run through the complete verification checklist:

| Test Step                    | Verification Method                                         | Expected Result                                                             |
| :--------------------------- | :---------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **1. API Health**            | `curl -i https://<BACKEND>/health`                          | HTTP `200 OK`, `{"status":"ok","database":"connected","mongo":"connected"}` |
| **2. API Categories**        | `curl -i https://<BACKEND>/api/v1/categories`               | HTTP `200 OK`, JSON array with 5 pre-seeded categories                      |
| **3. Frontend Load**         | Open `https://<FRONTEND>` in browser                        | Home page loads with banners, category pills, and product grid              |
| **4. Customer Registration** | Click _Login_ -> _Register_ with new email                  | Account created, welcome notification shown                                 |
| **5. Customer Login**        | Log in with credentials                                     | JWT access token received, refresh cookie stored                            |
| **6. Cart Operations**       | Click _Add_ on any product                                  | Cart updates with item, price calculation matches                           |
| **7. COD Checkout**          | Proceed to checkout, select COD, enter address, place order | Order placed, redirect to `/orders/:id` confirmation screen                 |
| **8. Payment Gateway**       | Select Online Payment (Razorpay)                            | Razorpay modal renders with real/test Key ID                                |
