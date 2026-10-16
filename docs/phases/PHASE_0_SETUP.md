# Phase 0: Laptop & Development Environment Setup (Windows)

## Goal
Prepare an empty Windows machine with all the tools, runtimes, database services, and utilities needed to develop, run, test, and containerize **Zippy**, a production-ready quick-commerce grocery web app.

---

## Exact Toolchain & Version Inventory

All packages were inspected, selected, and installed via Windows Package Manager (`winget`) with exact pinned versions:

| Tool | Winget ID | Pinned / Installed Version | Scope | Executable Location |
|---|---|---|---|---|
| **Git** | `Git.Git` | `2.55.0.5` (`git version 2.55.0.windows.5`) | Machine | `C:\Program Files\Git\cmd\git.exe` |
| **Node.js (LTS)** | `OpenJS.NodeJS.LTS` | `24.20.0` (npm `11.19.0`) | Machine | `C:\Program Files\nodejs\node.exe` |
| **pnpm** | Global npm | `12.14.0` | User | `C:\Users\DELL\AppData\Roaming\npm\pnpm.cmd` |
| **MySQL Server** | `Oracle.MySQL` | `8.4.9` (8.4.x LTS) | Machine | `C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe` |
| **MySQL Workbench** | `Oracle.MySQLWorkbench` | `26.7.0` | Machine | `C:\Program Files\MySQL\MySQL Workbench 8.0 CE\MySQLWorkbench.exe` |
| **MongoDB Server** | `MongoDB.Server` | `8.0.23` (8.0.x) | Machine | `C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe` |
| **MongoDB Shell** | `MongoDB.Shell` | `2.13.0` | User | `C:\Users\DELL\AppData\Local\Programs\mongosh\mongosh.exe` |
| **MongoDB Compass** | `MongoDB.Compass.Full` | `1.53.0.0` | User | `C:\Users\DELL\AppData\Local\Programs\MongoDB Compass\MongoDBCompass.exe` |
| **Docker Desktop** | `Docker.DockerDesktop` | `4.95.0` (Docker `29.8.2`) | Machine | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` |
| **VS Code** | `Microsoft.VisualStudioCode` | `1.142.0` | User | `C:\Users\DELL\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd` |
| **Bruno API Client**| `Bruno.Bruno` | `4.2.1` | User | `C:\Program Files\Bruno\Bruno.exe` |

---

## What Was Done

1. **Winget Verification:** Verified `winget` CLI operational (`v1.29.380`).
2. **Toolchain Installation:**
   - Installed Node.js LTS `v24.20.0` and verified npm `v11.19.0`.
   - Installed pnpm `v12.14.0` globally via npm.
   - Installed MySQL Community Server `8.4.9` LTS.
   - Installed MongoDB Server `8.0.23` and MongoDB Shell `2.13.0`.
   - Installed GUI management tools: MySQL Workbench `26.7.0`, MongoDB Compass `1.53.0.0`, Bruno `4.2.1`, and VS Code `1.142.0`.
3. **Environment & PATH Configuration:**
   - Configured persistent Windows User `PATH` with:
     - `C:\Program Files\MySQL\MySQL Server 8.4\bin`
     - `C:\Program Files\MongoDB\Server\8.0\bin`
     - `C:\Users\DELL\AppData\Local\Programs\mongosh`
   - Configured Git global settings:
     - `user.name`: `Mohd Hamza Shaikh `
     - `user.email`: `kmohdhamza10@gmail.com`
     - `core.autocrlf`: `true` (standard Windows line ending translation)
4. **Database Initialization & Security Configuration:**
   - Initialized MySQL 8.4 data directory (`C:\ProgramData\MySQL\MySQL Server 8.4\Data`) and configured `my.ini` with `utf8mb4` character set.
   - Generated strong, cryptographically secure 32-character passwords stored exclusively in git-ignored `.env`.
   - Secured MySQL `root@localhost` with a dedicated generated password.
   - Created least-privilege application database user: `zippy_user` restricted to `zippy_dev`.
   - Created MySQL database: `zippy_dev`.
   - Registered and confirmed `MySQL84` as a native Windows service (`Status: Running`, `StartType: Automatic`).
   - Initialized MongoDB `MongoDB` Windows service (`Status: Running`, `StartType: Automatic`).
   - Created MongoDB database: `zippy_dev`.
   - Executed Phase 0 cleanup: rotated `zippy_user` password, purged all temporary test users/databases (`quickcart_user`, `quickcart_dev`), verified `git check-ignore .env`, and sanitized all documentation so zero secrets are stored in documentation or git history.
5. **Automation & Documentation:**
   - Created `scripts/setup-windows.ps1` for one-click setup reproduction.
   - Created `scripts/register-mysql-service.ps1` for elevating and registering MySQL as a native Windows service.
   - Initialized Git repository on `main` branch with comprehensive `.gitignore` and `.env.example`.

---

## Files Created / Changed

- `d:\Zippy\.gitignore` - Strict exclusions for `.env`, `node_modules`, build artifacts, and logs.
- `d:\Zippy\.env` - Git-ignored local configuration containing generated credentials for MySQL and MongoDB (never committed).
- `d:\Zippy\.env.example` - Template environment file with non-sensitive placeholders.
- `d:\Zippy\scripts\setup-windows.ps1` - Full automation script to replicate Phase 0 on Windows.
- `d:\Zippy\scripts\register-mysql-service.ps1` - Administrator helper to register the MySQL84 Windows service.
- `d:\Zippy\docs\phases\PHASE_0_SETUP.md` - Phase 0 documentation and verification record (secrets-free).
- `C:\ProgramData\MySQL\MySQL Server 8.4\my.ini` - Production-aligned local configuration for MySQL.

---

## Commands to Run and Verify

Refresh the environment PATH in PowerShell before running checks:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 1. Verify Installed CLI Tools
```powershell
git --version
node -v
npm -v
pnpm -v
mysql --version
mongod --version
mongosh --version
docker --version
```

### 2. Verify Windows Services
```powershell
Get-Service MySQL84, MongoDB | Select-Object Name, Status, StartType
```
*Expected: Both services display `Status: Running` and `StartType: Automatic`.*

### 3. Verify MongoDB Status & Database
```powershell
# Ping MongoDB service
mongosh --eval "db.adminCommand('ping')"

# Verify databases
mongosh --eval "show dbs"
```
*Expected: `{ ok: 1 }` and `zippy_dev` listed.*

### 4. Verify MySQL Status & Connection
Check connection using credentials directly from `.env`:
```powershell
# Connect as zippy_user to zippy_dev
mysql -u zippy_user --password="<password from .env>" -D zippy_dev -e "SELECT DATABASE(), USER(), VERSION();"
```
*Expected: `DATABASE(): zippy_dev`, `USER(): zippy_user@localhost`, `VERSION(): 8.4.9`.*

### 5. Verify Git Ignores Secrets
```powershell
git check-ignore .env
```
*Expected: `.env`.*

---

## Decisions and Why

1. **pnpm over npm/yarn:**
   - pnpm uses hard links and content-addressable storage, saving disk space on Windows and making monorepo workspaces significantly faster.
2. **MySQL 8.4 LTS & MongoDB 8.0:**
   - Both are current Long Term Support / stable production releases. MySQL 8.4 LTS guarantees ABI/API stability for relational financial records, while MongoDB 8.0 provides high-throughput catalog indexing.
3. **Dual Database Architecture (MySQL + MongoDB):**
   - **MySQL (Prisma):** Relational, transactional integrity with ACID guarantees for checkout, orders, payments, coupons, users, and audit logs.
   - **MongoDB (Mongoose):** Dynamic schema flexibility, full-text search, and high-frequency read optimization for product catalogs, categories, banners, and carts.
4. **Secrets Exclusively in Git-ignored `.env`:**
   - Passwords for `root` and `zippy_user` are generated randomly and stored strictly in `.env`. Documentation and templates only contain placeholders like `<password from .env>`.
5. **Windows Services for Background Stability:**
   - Both `MySQL84` and `MongoDB` run as native Windows services (`Automatic` start type), eliminating the need to launch foreground daemon processes manually.

---

## Issues Faced and Fixes

1. **New Package PATH Latency in Running Shell:**
   - *Issue:* Freshly installed MSI binaries (`node`, `mongosh`, `mysql`) were not detected immediately in the active shell.
   - *Fix:* Configured persistent User `PATH` entries and refreshed `$env:Path` from both `Machine` and `User` scopes dynamically.
2. **MySQL 8.4 Decoupled Service Setup:**
   - *Issue:* Unlike older MySQL MSI installers that bundled service registration wizards, MySQL 8.4 installs raw binaries and requires explicit initialization.
   - *Fix:* Executed `mysqld --initialize-insecure` against `C:\ProgramData\MySQL\MySQL Server 8.4\Data`, authored `my.ini`, and registered `MySQL84` as a Windows service set to `Automatic` startup.
3. **Non-Elevated Process Elevation Constraints:**
   - *Issue:* Windows denies service creation (`sc.exe` / `New-Service`) without an elevated token (Administrator).
   - *Fix:* Created `scripts/register-mysql-service.ps1` with self-elevation to cleanly install and start the `MySQL84` service under UAC.
4. **Secret Hygiene in Documentation:**
   - *Issue:* An initial verification command included a plaintext password string.
   - *Fix:* Rotated the `zippy_user` password in MySQL and `.env`, cleansed `PHASE_0_SETUP.md` with non-sensitive placeholders, dropped legacy `quickcart_*` entries, and sanitized git history.

---

## Troubleshooting Guide

### 1. PATH Issues (Command not found)
If a command like `node`, `pnpm`, `mysql`, or `mongosh` is not recognized in a newly opened PowerShell window:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
To permanently ensure all tools are in User PATH:
```powershell
[System.Environment]::SetEnvironmentVariable("Path", "$([System.Environment]::GetEnvironmentVariable('Path', 'User'));C:\Program Files\MySQL\MySQL Server 8.4\bin;C:\Program Files\MongoDB\Server\8.0\bin;C:\Users\$env:USERNAME\AppData\Local\Programs\mongosh", "User")
```

### 2. Services Not Starting
- **MongoDB:**
  ```powershell
  # Check service status
  Get-Service MongoDB
  # Start if stopped
  Start-Service MongoDB
  ```
- **MySQL:**
  ```powershell
  # Check service status
  Get-Service MySQL84
  # Start if stopped
  Start-Service MySQL84
  ```

### 3. Port Conflicts (3306, 27017, 5000, 5173)
If any required port is occupied by a stale process, identify and terminate the process:
```powershell
# Check which process is listening on the port (e.g., 3306 or 5000)
Get-NetTCPConnection -LocalPort 3306, 27017, 5000, 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess

# Kill the conflicting PID if needed:
Stop-Process -Id <PID> -Force
```

---

## Security Notes

1. **Credentials Stored Securely:**
   - Root password and `zippy_user` password were generated with cryptographically secure random bytes.
   - Credentials exist only in `.env`, which is strictly ignored in `.gitignore` and verified by `git check-ignore`.
   - Docs and committed files contain only `<password from .env>`.
2. **Principle of Least Privilege:**
   - `zippy_user` has DDL and DML access restricted strictly to `zippy_dev`. No administrative privileges on `mysql` system schema or server configuration are granted.
3. **Audit Readiness:**
   - MySQL binary logs and connection audit capabilities are supported through `my.ini`.

---

## What is Next

Proceed to **Phase 1: Project scaffold and tooling**:
- Initialize monorepo directory layout (`client/`, `server/`, `docker/`, etc.).
- Set up ESLint, Prettier, Husky, and lint-staged.
- Build Express.js backend skeleton with Zod environment validation, Pino structured logging, health checks, and graceful shutdown.
- Build Vite + React 18 + Tailwind frontend skeleton.
