# Zippy Production Deployment Runbook

> **Target Platforms:** Linux VPS (Docker Compose + Hardened Nginx) & Managed Cloud Platforms (Render, Railway, AWS ECS)  
> **Tech Stack:** Node.js 24 LTS, pnpm 12, Express, Prisma (MySQL 8.4), Mongoose (MongoDB 8.0), React 18, Vite, Nginx Alpine

---

## 1. Production Environment Checklist

Before deploying Zippy to a live staging or production environment, complete every item in this checklist:

### 1.1 Cryptographic Secrets Generation

All production secrets must be generated using cryptographically secure random bytes (minimum 32 characters / 256 bits). **Never reuse development secrets.**

Run the following commands on your administrative workstation or server:

```bash
# Generate unique 64-character hexadecimal keys
openssl rand -hex 32  # For JWT_ACCESS_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
openssl rand -hex 32  # For JWT_RESET_PASSWORD_SECRET
openssl rand -hex 32  # For JWT_EMAIL_VERIFICATION_SECRET
openssl rand -base64 24 # For MySQL ROOT and User Passwords
openssl rand -base64 24 # For SUPER_ADMIN_PASSWORD
```

### 1.2 Managed Database Configuration

#### A. Managed MongoDB (MongoDB Atlas)

1. Provision an **M10 or higher** cluster running MongoDB 7.0 / 8.0 in your primary cloud region (e.g. AWS `ap-south-1` Mumbai).
2. Create a dedicated database user (e.g., `zippy_atlas_user`) with `readWriteAnyDatabase` or scoped to `zippy_production`.
3. In **Network Access**, whitelist your production VPS elastic IP or configure AWS VPC Peering.
4. Obtain the connection URI:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/zippy_production?retryWrites=true&w=majority&appName=ZippyProd"
   ```

#### B. Managed MySQL (AWS RDS / DigitalOcean / PlanetScale)

1. Provision a MySQL 8.4 LTS instance (e.g., `db.t4g.small` on AWS RDS).
2. Set parameter group options:
   - `character_set_server = utf8mb4`
   - `collation_server = utf8mb4_unicode_ci`
   - `max_connections = 200`
3. Enforce TLS/SSL connections. In your connection string:
   ```env
   DATABASE_URL="mysql://<user>:<password>@<rds-endpoint>:3306/zippy_production?sslaccept=strict"
   ```

### 1.3 DNS Records

Configure the following records with your DNS provider (Cloudflare, Route 53, etc.):

| Type  | Name                   | Content / Target            | TTL         | Proxy Status                        |
| :---- | :--------------------- | :-------------------------- | :---------- | :---------------------------------- |
| `A`   | `zippy.yourdomain.com` | `<VPS_STATIC_IPV4>`         | Auto / 300s | DNS Only (Initial SSL verification) |
| `CAA` | `@`                    | `0 issue "letsencrypt.org"` | 3600s       | —                                   |

---

## 2. Zero-Downtime Migration & Rollback Strategy

Prisma schema migrations must be applied safely without locking tables or breaking running application instances.

### 2.1 The Expand-and-Contract Migration Workflow

```
[Phase 1: Expand] ----> [Phase 2: Deploy Code] ----> [Phase 3: Backfill] ----> [Phase 4: Contract]
Add nullable col        Code supports old+new         Sync legacy rows          Drop old column
```

1. **Step 1: Non-Breaking Schema Change (Expand):**
   - New columns must be either `nullable` or have a database-level `DEFAULT` value.
   - Never rename or drop columns in the same release as code changes.
2. **Step 2: Apply Migrations (Pre-Deployment):**
   ```bash
   # Run against production database before rolling container restart
   docker compose -f docker-compose.prod.yml run --rm server npx prisma migrate deploy
   ```
3. **Step 3: Rolling Application Deploy:**
   Update application containers. Running instances continue working because all schema changes are backward-compatible.
4. **Step 4: Cleanup (Contract):**
   Once the previous application version is fully decommissioned, remove deprecated columns in a subsequent release.

### 2.2 Database Rollback Steps

If an issue occurs during a deployment:

1. **Roll Back Application Containers:**
   ```bash
   # Revert to previously tagged image
   docker compose -f docker-compose.prod.yml up -d --no-deps --build server client
   ```
2. **Mark Migration as Rolled Back (if schema was touched):**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm server npx prisma migrate resolve --rolled-back <migration_name>
   ```
3. **Restore from Point-in-Time Backup (Disaster Scenario):**
   ```bash
   # MySQL restore from automated dump
   mysql -h <host> -u <user> -p zippy_production < /backups/zippy_backup_pre_deploy.sql
   ```

---

## 3. VPS Deployment Guide (Ubuntu 22.04 / 24.04 LTS)

Follow these steps to deploy Zippy on an unmanaged Linux VPS (e.g. DigitalOcean Droplet, AWS EC2, Hetzner, Linode).

### Step 3.1: Host Hardening & Prerequisites

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install essential tools and Docker
sudo apt install -y curl wget git ufw certbot
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Configure firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Certbot & Redirection)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 3.2: Clone Repository & Configure Environment

```bash
# 1. Clone repository into production location
sudo mkdir -p /opt/zippy && sudo chown $USER:$USER /opt/zippy
git clone https://github.com/your-org/zippy.git /opt/zippy
cd /opt/zippy

# 2. Copy and configure production environment
cp .env.production.example .env
nano .env  # Enter your actual production secrets and domain
```

### Step 3.3: Issue SSL Certificate via Let's Encrypt & Enable HTTPS

The production stack supports automated TLS termination with HTTP-to-HTTPS (301) redirection, modern ciphers, and ACME challenge preservation.

#### A. Initial SSL Certificate Issuance

```bash
# 1. Create shared ACME challenge directory
sudo mkdir -p /var/www/certbot

# 2. Obtain initial SSL certificate using Certbot standalone (or webroot)
sudo certbot certonly --standalone \
  --preferred-challenges http \
  -d zippy.yourdomain.com \
  --email security-admin@yourdomain.com \
  --agree-tos \
  --non-interactive
```

_Note: Once issued, certificates reside in `/etc/letsencrypt/live/zippy.yourdomain.com/` (`fullchain.pem`, `privkey.pem`, `chain.pem`) which mount into the Nginx container._

#### B. Configure Environment Variables for HTTPS

In your production `.env`:

```env
DOMAIN_NAME=zippy.yourdomain.com
SSL_CERT_PATH=/etc/letsencrypt/live/zippy.yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/zippy.yourdomain.com/privkey.pem
SSL_TRUSTED_CERT_PATH=/etc/letsencrypt/live/zippy.yourdomain.com/chain.pem
```

The Nginx container automatically populates `docker/nginx/templates/default.conf.template` via `envsubst` upon startup, enforcing:

- **Port 80:** ACME challenge path (`/.well-known/acme-challenge/`) open for Certbot renewals, with 301 redirection for all other HTTP traffic to HTTPS.
- **Port 443:** TLSv1.2 & TLSv1.3 modern ciphers, HSTS (`max-age=15768000`), secure proxy forwarding to the Express API, and cached SPA asset serving.

#### C. Automated SSL Renewal Cron Job

Let's Encrypt certificates expire every 90 days. Schedule an automated renewal check twice daily:

```bash
# Add renewal job to root crontab
sudo crontab -e

# Renewal command:
0 3 * * * certbot renew --webroot -w /var/www/certbot --quiet && docker compose -f /opt/zippy/docker-compose.prod.yml exec -T client nginx -s reload
```

---

### Step 3.3b: Payment Gateway Configuration (Razorpay)

Zippy supports dual-mode Razorpay payment operations:

1. **Simulated Mode (Dev / Test / Offline):**
   - Active when `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` are omitted or contain default placeholders.
   - Generates deterministic simulated orders (`order_<hex>`) and accepts simulated signatures (`simulated_sig_...`).
   - Zero external network requests; ideal for CI/CD runs, offline local development, and Vitest test suites.

2. **Test Mode (Real Razorpay Sandbox API):**
   - Sign up for a free developer account at [Razorpay Dashboard](https://dashboard.razorpay.com/).
   - Navigate to **Settings > API Keys** and click **Generate Key** in **Test Mode**.
   - Copy Key ID (`rzp_test_...`) and Key Secret into `.env`:
     ```env
     RAZORPAY_KEY_ID=rzp_test_1234567890abcdef
     RAZORPAY_KEY_SECRET=your_test_key_secret_here
     RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret_here
     ```
   - When configured and outside `NODE_ENV=test`, the backend calls real Razorpay APIs to generate authentic orders.

3. **Live Production Mode:**
   - Switch to **Live Mode** in the Razorpay Dashboard after KYC completion.
   - Generate Live API keys (`rzp_live_...`).
   - Configure Webhook URL in Razorpay Dashboard:
     - **URL:** `https://zippy.yourdomain.com/api/v1/payments/webhook`
     - **Events:** `payment.captured`, `payment.failed`, `order.paid`
     - **Secret:** Generate a 32+ character random string and store in `RAZORPAY_WEBHOOK_SECRET`.
   - Update production `.env`:
     ```env
     RAZORPAY_KEY_ID=rzp_live_your_actual_key_id
     RAZORPAY_KEY_SECRET=your_production_secret
     RAZORPAY_WEBHOOK_SECRET=your_production_webhook_secret
     ```

### Step 3.4: Launch the Production Stack

```bash
# 1. Build and start containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# 2. Execute database migrations
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# 3. Seed initial Super Admin and Catalog data
docker compose -f docker-compose.prod.yml exec server node src/database/seed.js

# 4. Verify running services and health status
docker compose -f docker-compose.prod.yml ps
```

### Step 3.5: Verify Deployment Health

```bash
# 1. Test backend health check endpoint
curl -f http://localhost:5000/health
# Response: {"status":"UP","uptime":...,"timestamp":...}

# 2. Test public HTTPS endpoint
curl -I https://zippy.yourdomain.com
# Response: HTTP/2 200 OK (with strict security headers)
```

---

## 4. Managed Cloud Platform Guide (Render & Railway)

For zero-server-management deployments, deploy Zippy on Render or Railway.

### 4.1 Deployment on Render (render.com)

1. **Prerequisite:** Create a free MongoDB Atlas cluster and a managed MySQL database (e.g. Aiven, PlanetScale, or Render PostgreSQL with Prisma adaptation).
2. **Backend Web Service (`@zippy/server`):**
   - **Environment:** Docker
   - **Dockerfile Path:** `./server/Dockerfile`
   - **Context:** `.` (monorepo root)
   - **Environment Variables:** Set all variables from `.env.production.example`.
   - **Health Check Path:** `/health`
3. **Frontend Static Site (`@zippy/client`):**
   - **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @zippy/client build`
   - **Publish Directory:** `client/dist`
   - **Redirects / Rewrites:**
     - Rule 1: `/api/*` -> `https://zippy-api.onrender.com/api/*` (Rewrite)
     - Rule 2: `/*` -> `/index.html` (Rewrite for React Router SPA)

### 4.2 Deployment on Railway (railway.app)

1. Connect your GitHub repository to Railway.
2. In the Railway project canvas:
   - Add **MySQL** plugin from the template gallery.
   - Add **MongoDB** plugin.
3. Configure the **Server** service:
   - Root Directory: `/`
   - Dockerfile: `server/Dockerfile`
   - Reference database variables: `DATABASE_URL = ${{MySQL.DATABASE_URL}}`
4. Configure the **Client** service:
   - Dockerfile: `client/Dockerfile`
   - Expose public domain: `zippy.up.railway.app`

---

## 5. Automated Backups & Maintenance

### 5.1 Automated Database Backup Script

Create `/opt/zippy/scripts/backup.sh`:

```bash
#!/usr/bin/env bash
set -eo pipefail
BACKUP_DIR="/backups/zippy/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# 1. Backup MySQL database
docker compose -f /opt/zippy/docker-compose.prod.yml exec -T mysql \
  mysqldump -u zippy_prod_user -p"$MYSQL_PASSWORD" zippy_production \
  | gzip > "$BACKUP_DIR/mysql_$(date +%H%M%S).sql.gz"

# 2. Backup MongoDB database
docker compose -f /opt/zippy/docker-compose.prod.yml exec -T mongodb \
  mongodump --db zippy_production --archive \
  | gzip > "$BACKUP_DIR/mongo_$(date +%H%M%S).archive.gz"

# Keep only last 14 days of backups
find /backups/zippy/ -type d -ctime +14 -exec rm -rf {} +
```

Add to cron (`crontab -e`):

```cron
0 2 * * * /opt/zippy/scripts/backup.sh >> /var/log/zippy_backup.log 2>&1
```

---

## 6. Incident Response & Troubleshooting

| Symptom                     | Diagnostic Step                                | Resolution                                                                                           |
| :-------------------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `502 Bad Gateway` on Nginx  | `docker logs zippy-prod-server`                | Backend container is restarting or failing healthcheck. Check database connectivity.                 |
| Database Connection Refused | `docker compose -f docker-compose.prod.yml ps` | Ensure MySQL & Mongo healthchecks report `healthy`. Check volume disk space.                         |
| JWT Token Rejection in Prod | Inspect `COOKIE_SECURE` and HTTPS              | Ensure browser is accessing via `https://`. Cookies with `Secure` flag are rejected over plain HTTP. |
| Prisma Migration Drift      | `npx prisma migrate status`                    | Resolve migration drift using `prisma migrate resolve` or baseline production schema.                |
