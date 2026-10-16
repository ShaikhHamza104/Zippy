# Phase 3: Authentication and Security Core

## Goal

Design and deploy an enterprise-grade, defense-in-depth authentication and security core for **Zippy**:

1. **Authentication Endpoints:** Full implementation under `/api/v1/auth`:
   - `POST /register`: Self-registration for Customers with password policy enforcement.
   - `POST /login`: Credential verification with anti-enumeration protection and automatic 5-attempt account lockout.
   - `POST /logout`: Cryptographic session revocation and cookie clearance.
   - `POST /refresh`: Refresh token rotation with family tracking and instant replay/reuse attack detection.
   - `POST /forgot-password`: Anti-enumeration password recovery dispatching single-use tokens and OTPs.
   - `POST /reset-password`: Cryptographically bounded password reset tied to current password hash state.
   - `POST /change-password`: Authenticated credential update with active session termination.
   - `POST /verify-email`: Email confirmation flow.
   - `GET /me`: Authenticated profile retrieval.
   - `POST /create-admin` (and alias `/admins`): Administrative privilege delegation strictly restricted to `SUPER_ADMIN`.
2. **Session & Token Architecture:**
   - Short-lived JWT access tokens (15-minute lifespan).
   - Long-lived, cryptographically secure opaque refresh tokens stored strictly as SHA-256 hashes in MySQL (`refresh_tokens` table).
   - Refresh tokens transmitted via `httpOnly`, `SameSite=lax` cookies, with the `Secure` flag driven dynamically by environment variables (`COOKIE_SECURE`).
   - Refresh token rotation coupled with family identifier (`familyId`) reuse detection that revokes all child sessions upon detecting token replay.
3. **Defense-in-Depth Security:**
   - Bcrypt password hashing (cost factor 12).
   - Strict password policy rejecting common passwords and enforcing minimum 8 characters.
   - Constant-time dummy bcrypt comparison on non-existent emails to thwart user enumeration via timing attacks.
   - Account lockout after 5 consecutive failed login attempts (15-minute cool-off window).
   - Strict rate limiting on sensitive authentication routes (`express-rate-limit`).
   - Strict request body validation via Zod schemas rejecting unrecognized/injected fields (`.strict()`).
   - CSRF protection on cookie-bearing endpoints (`requireCsrfHeader`) requiring custom client headers (`X-Requested-With`, `X-Zippy-Client`).
   - Append-only security logging: Every login attempt logged to `login_logs`; administrative and credential-lifecycle actions recorded to `audit_logs`.
   - Dual-mode email service (console/logger output in development/testing, nodemailer SMTP in production).

---

## Threat Model & Security Controls

| Threat Vector                             | Attack Scenario                                                                                                                | Impact                                                        | Mitigation in Zippy                                                                                                                                                                                                                                                                                                                                                                                    |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Credential Stuffing & Brute Force**     | Automated scripts submit hundreds of password guesses against customer and admin accounts.                                     | Account takeover, unauthorized access.                        | **Account Lockout:** Locks account for 15 minutes after 5 consecutive failures.<br>**Rate Limiting:** `authRateLimiter` restricts IP to 10 requests / 15 min.<br>**Bcrypt 12:** High computational cost renders offline/online guessing intractable.                                                                                                                                                   |
| **User Enumeration (Timing & Responses)** | Attacker determines whether an email exists by measuring response time differences or distinct error messages.                 | Targeted phishing, targeted credential stuffing.              | **Generic Messages:** "Invalid email or password" returned uniformly for both bad emails and bad passwords.<br>**Constant-Time Dummy Comparison:** When an email does not exist, `compareTimingSafeDummy` executes a full bcrypt compare with a static dummy hash.<br>**Identical Forgot-Password Output:** Returns identical generic acknowledgment whether email is registered or not.               |
| **Privilege Escalation**                  | Malicious actor passes `"role": "ADMIN"` or `"role": "SUPER_ADMIN"` during public customer registration.                       | Unauthorized administrative access.                           | **Strict Zod Schemas:** `registerSchema` uses `.strict()` which rejects unexpected fields.<br>**Server-Enforced Role:** Role is unconditionally hardcoded to `'CUSTOMER'` on creation.<br>**RBAC Middleware:** `createAdmin` endpoint requires valid JWT and `requireRole('SUPER_ADMIN')`.                                                                                                             |
| **Token Theft & Replay (Refresh Token)**  | An attacker steals an issued refresh token from network transit or device memory and attempts to use it.                       | Persistent unauthorized session impersonation.                | **Opaque Hashed Storage:** Raw tokens are never stored in MySQL; only SHA-256 hashes are persisted.<br>**Refresh Token Rotation:** Every refresh invalidates the used token and generates a new one.<br>**Reuse Detection:** If an already-revoked token is presented, the server detects token theft, immediately revokes the entire `familyId` of tokens, and logs a security alert in `audit_logs`. |
| **Cross-Site Request Forgery (CSRF)**     | Malicious third-party website submits forged requests to `/refresh` or `/logout` using ambient browser cookies.                | Unauthorized session extension or forced session destruction. | **SameSite Cookie:** Refresh cookies are set with `SameSite=lax`.<br>**Custom Header Requirement:** Endpoints require custom client headers (`X-Requested-With` or `X-Zippy-Client`). Standard browser cross-origin requests cannot set custom headers without CORS preflight approval.                                                                                                                |
| **Weak Password Adoption**                | Users choose predictable passwords like `password123` or `12345678`.                                                           | Vulnerability to simple dictionary attacks.                   | **Password Policy Validator:** `validatePasswordPolicy` enforces minimum 8 characters, maximum 128 characters, and blocks passwords present in common password lists.                                                                                                                                                                                                                                  |
| **Token Replay on Password Reset**        | Attacker intercepts a password reset link and attempts to reuse it after the legitimate user has already reset their password. | Account takeover.                                             | **Dynamic Key Binding:** Reset tokens are cryptographically signed using a compound secret: `JWT_RESET_PASSWORD_SECRET + ':' + user.passwordHash`. Once the password changes, the signing key permanently alters, instantly invalidating all issued reset tokens.                                                                                                                                      |
| **Stale Sessions After Password Change**  | User changes password after an account compromise, but prior active sessions remain valid.                                     | Adversary retains active access via existing refresh tokens.  | **Universal Session Invalidation:** Upon password reset or change, all refresh tokens belonging to the user (`userId`) are marked `isRevoked: true` in MySQL.                                                                                                                                                                                                                                          |
| **NoSQL Query Injection**                 | Attacker submits MongoDB operator objects (e.g. `{"$gt": ""}`) in JSON payload bodies or query parameters.                     | Data exfiltration or auth bypass in MongoDB queries.          | **express-mongo-sanitize:** Globally sanitizes `req.body`, `req.query`, and `req.params` by stripping `$` and `.` operators.                                                                                                                                                                                                                                                                           |
| **HTTP Parameter Pollution (HPP)**        | Attacker passes duplicate query parameters to cause parser discrepancies.                                                      | Unexpected route handling or security rule bypass.            | **hpp Middleware:** Cleanses parameter arrays across incoming HTTP requests.                                                                                                                                                                                                                                                                                                                           |

---

## What Was Done

1. **Password Policy & Cryptographic Hashing (`server/src/utils/password.js`):**
   - Implemented `hashPassword` and `comparePassword` using `bcryptjs` with cost 12.
   - Built `compareTimingSafeDummy` computing bcrypt comparison against a pre-generated static hash when a requested email does not exist in the database.
   - Built `validatePasswordPolicy` enforcing length ($\ge 8$ chars) and checking against common weak passwords.
2. **Token & Cookie Architecture (`server/src/utils/tokens.js`):**
   - Access token issuance via signed JWTs (15-minute expiry).
   - Cryptographically random 80-character opaque refresh tokens hashed with SHA-256 before persistence in MySQL.
   - Single-use password reset tokens signed with compound key `JWT_RESET_PASSWORD_SECRET + ':' + user.passwordHash` (15-minute expiry).
   - Single-use email verification tokens signed with `JWT_EMAIL_VERIFICATION_SECRET` (24-hour expiry).
   - Cookie utility configured with `httpOnly: true`, `sameSite: 'lax'`, `path: '/api/v1/auth'`, and environment-driven `secure: isCookieSecure()`.
3. **Audit Logging & Login Logging (`server/src/utils/auditLogger.js`, `server/src/utils/loginLogger.js`):**
   - Created `recordLoginLog` logging IP, user agent, success/fail state, and failure reason to `login_logs`.
   - Created `recordAuditLog` writing administrative events (`CREATE_ADMIN`), credential updates (`PASSWORD_CHANGED`, `PASSWORD_RESET_COMPLETED`), and security events (`ACCOUNT_LOCKED`, `REFRESH_TOKEN_REUSE_DETECTED`) to `audit_logs`.
4. **Email Notification Service (`server/src/services/email.service.js`):**
   - Built unified service supporting production SMTP via `nodemailer` and development logging via Pino.
   - Provides structured password reset and email verification templates with reset links and OTPs.
   - Strictly ensures passwords and raw secrets are never printed or logged.
5. **Rate Limiting Middleware (`server/src/middleware/rateLimiter.js`):**
   - Configured `authRateLimiter` (10 requests / 15 minutes per IP on `/login`, `/register`, `/forgot-password`, `/reset-password`).
   - Configured `generalApiLimiter` (200 requests / 15 minutes per IP).
   - Configured automatic bypass in `test` environment to allow rapid automated testing.
6. **Authentication & RBAC Middleware (`server/src/middleware/auth.js`):**
   - `requireAuth`: Validates Bearer JWT, confirms user exists in MySQL, and verifies user is not blocked or soft-deleted.
   - `requireRole(...allowedRoles)`: Enforces role permissions (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`).
   - `requireCsrfHeader`: Checks for custom client headers (`X-Requested-With`, `X-Zippy-Client`) on cookie-bearing endpoints.
7. **Zod Validation Schemas (`server/src/validation/auth.validation.js`):**
   - Authored strict Zod schemas for `register`, `login`, `createAdmin`, `forgotPassword`, `resetPassword`, `changePassword`, and `verifyEmail`.
   - Built `validateBody` middleware returning structured 400 validation error responses.
8. **Auth Controller & Endpoints (`server/src/controllers/auth.controller.js`, `server/src/routes/v1/auth.routes.js`):**
   - Implemented all 10 core auth workflows under `/api/v1/auth`.
   - Fully wired into Express application pipeline in `server/src/app.js` with `cookie-parser` and `express-mongo-sanitize`.
9. **Automated Testing Suite (`server/tests/auth.test.js`):**
   - Implemented 27 automated tests covering full lifecycle and adversarial attack scenarios:
     - Customer registration, weak password rejection, common password rejection, duplicate handling, role escalation defense.
     - RBAC boundaries and admin creation delegation by Super Admin.
     - Login, timing attack resistance, account lockout after 5 failures, blocked user lockout.
     - Tampered JWT signature and expired token detection.
     - CSRF protection validation on refresh and logout.
     - Refresh token rotation and family-wide reuse attack detection.
     - Forgot password anti-enumeration and reset password replay prevention.
     - Authenticated password change and active session revocation.
     - Email verification confirmation and tampering rejection.

---

## Files Created / Changed

- `.env` - Generated cryptographically secure 64-character random secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_PASSWORD_SECRET`, `JWT_EMAIL_VERIFICATION_SECRET`, plus `COOKIE_SECURE`, `CLIENT_URL`, and SMTP placeholders (never committed).
- `.env.example` - Updated with non-sensitive authentication and SMTP configuration placeholders.
- `server/package.json` - Added `jsonwebtoken`, `cookie-parser`, `express-rate-limit`, `nodemailer`, and `express-mongo-sanitize`.
- `server/vitest.config.js` - Configured `testTimeout: 20000` to allow multi-iteration bcrypt cost 12 computations in test suites.
- `server/src/app.js` - Integrated `cookieParser()` and `mongoSanitize()` middleware.
- `server/src/config/env.js` - Added Zod validation enforcing minimum 32 characters on JWT secrets, plus `isCookieSecure()` helper.
- `server/src/utils/password.js` - Password hashing (cost 12), comparison, timing-safe dummy compare, and policy validator.
- `server/src/utils/tokens.js` - JWT sign/verify, opaque token generator, SHA-256 hash helper, and cookie options.
- `server/src/utils/loginLogger.js` - Login attempt recorder for MySQL `login_logs`.
- `server/src/utils/auditLogger.js` - Security and administrative event logger for MySQL `audit_logs`.
- `server/src/services/email.service.js` - Dual-mode email dispatcher for password reset and email verification.
- `server/src/middleware/rateLimiter.js` - Rate limiting middleware for sensitive auth routes and general endpoints.
- `server/src/middleware/auth.js` - `requireAuth`, `requireRole`, and `requireCsrfHeader` middleware.
- `server/src/validation/auth.validation.js` - Strict Zod schemas and request validation middleware.
- `server/src/controllers/auth.controller.js` - Authentication controller with complete endpoint logic.
- `server/src/routes/v1/auth.routes.js` - Auth router mounted under `/api/v1/auth`.
- `server/src/routes/v1/index.js` - Mounted auth routes at `/auth`.
- `server/tests/auth.test.js` - 27 comprehensive unit and integration tests including adversarial attack vectors.
- `docs/phases/PHASE_3_AUTH_SECURITY.md` - Complete Phase 3 architecture, threat model, and verification documentation.

---

## Commands to Run and Verify

Refresh the environment PATH in PowerShell before running checks:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 1. Run Automated Linter

```powershell
pnpm run lint
```

_Expected: 0 errors and 0 warnings across `@zippy/server` and `@zippy/client`._

### 2. Run Comprehensive Test Suite

```powershell
pnpm run test
```

_Expected: All 44 tests pass across the monorepo (42 server tests covering auth, attack vectors, database layer, and health; 2 client component tests)._

### 3. Run Production Build

```powershell
pnpm run build
```

_Expected: Production client bundles compile cleanly without errors._

### 4. Background Server Smoke Test (Start, Test, Stop)

Start dev server in the background:

```powershell
$serverJob = Start-Process pnpm -ArgumentList "dev:server" -PassThru
Start-Sleep -Seconds 3
```

Test public endpoints and authentication error response:

```powershell
# 1. Health check
Invoke-RestMethod -Uri "http://localhost:5000/health"

# 2. API discovery
Invoke-RestMethod -Uri "http://localhost:5000/api/v1"

# 3. Auth endpoint smoke check (verify anti-enumeration response)
$body = '{"email":"admin@zippy.com","password":"wrongpass"}'
curl.exe -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d $body
```

Stop the server process:

```powershell
Stop-Process -Id $serverJob.Id -Force
```

---

## Decisions and Why

1. **Hashed Opaque Refresh Tokens vs. Stateful JWTs:**
   - Storing refresh tokens as raw strings in a database creates a single point of failure if the database is dumped. Zippy issues random opaque tokens (`crypto.randomBytes(40)`) and stores exclusively their SHA-256 hash. If the database is compromised, active session refresh tokens cannot be reconstructed.
2. **Refresh Token Family Tracking & Reuse Detection:**
   - Mobile and web networks encounter transient drops that can cause legitimate retry attempts. However, if an already-revoked refresh token is presented, this indicates an attacker is replaying an intercepted token. Tracking a UUID `familyId` allows the server to instantly invalidate all tokens in that family, immediately expelling both the legitimate user and the attacker and forcing re-authentication.
3. **Timing-Safe Dummy Password Comparison:**
   - In standard authentication, verifying an invalid email returns immediately, whereas verifying an invalid password performs a computation-heavy bcrypt comparison (~250ms). Attackers exploit this timing differential to map valid user emails. Zippy executes `compareTimingSafeDummy` using a static pre-hashed bcrypt string whenever a user is not found, ensuring uniform response latency.
4. **Compound Secret for Password Reset Tokens:**
   - Using `JWT_RESET_PASSWORD_SECRET + ':' + user.passwordHash` as the JWT signing key guarantees single-use invalidation without requiring a separate database table or stateful tracking. The moment `user.passwordHash` updates in MySQL upon reset, all previously issued reset tokens become mathematically invalid signatures.
5. **CSRF Mitigation via Custom Request Headers:**
   - For Single Page Applications (SPAs) storing tokens in cookies, traditional synchronized tokens add significant state overhead. By enforcing `SameSite=lax` and requiring a custom client header (`X-Requested-With` or `X-Zippy-Client`) on cookie-bearing endpoints (`/refresh`, `/logout`), browsers are prevented from submitting ambient cookies cross-origin without prior CORS preflight authorization.

---

## Issues Faced and Fixes

1. **Vitest Default 5000ms Timeout on Crypto-Intensive Tests:**
   - _Issue:_ Automated tests involving 5 sequential failed login attempts (5 bcrypt computations) plus user registration exceeded Vitest's default 5-second test timeout.
   - _Fix:_ Configured `testTimeout: 20000` in `server/vitest.config.js`, providing adequate headroom for deliberate cryptographic work factors without compromising security parameters.
2. **TDZ Circular Dependency in Security Guards:**
   - _Issue:_ In early iterations, logger imports inside environment guards triggered circular evaluation during module initialization.
   - _Fix:_ Used standard structured console warnings inside early security guards and structured Pino logging throughout runtime modules.
3. **Connection Forcibly Closed in Development Mode During Manual Testing:**
   - _Issue:_ During manual testing in `NODE_ENV=development`, sending HTTP requests (such as `POST /api/v1/auth/register`) or visiting endpoints caused client sockets to drop with `Unable to read data from the transport connection: An existing connection was forcibly closed by the remote host`. This was not caught by Vitest test suites because `NODE_ENV=test` suppresses `pinoHttp`, disables `pino-pretty` worker thread transports, and bypasses rate limiters.
   - _Root Causes:_
     1. **Uncaught Async Exceptions & Socket Termination:** In Express 4, asynchronous handler exceptions without explicit `next(err)` forwarding escape Express and trigger Node's `unhandledRejection` handler, which initiated `server.close()` and abrupt process termination mid-request.
     2. **Pino Worker Thread Serialization:** Under `NODE_ENV=development`, Pino uses a worker thread (`pino-pretty`). Without explicit `serializers: { err: pino.stdSerializers.err, req, res }`, Error objects with non-enumerable properties or custom attributes could fail cloning across the worker thread boundary.
     3. **Unprotected Email Delivery in Registration:** If email transport (SMTP) timed out or encountered delivery errors, throwing directly aborted registration after the MySQL user record was committed.
     4. **Missing Discovery Endpoint:** Navigating to `/api/v1/auth` in a browser returned a 404 error.
   - _Fixes:_
     1. Configured standard serializers in `server/src/config/logger.js` (`err`, `req`, `res`).
     2. Hardened all controller handlers (including `me` and `register`) with complete `try...catch (err) { next(err); }` forwarding.
     3. Made email verification dispatch non-fatal during registration, logging errors cleanly while returning the registered session.
     4. Configured `mongoSanitize({ allowDots: true, replaceWith: '_' })` in `app.js`.
     5. Added `GET /api/v1/auth` discovery route returning HTTP 200 with an interactive catalog of authentication endpoints.
     6. Verified live in `NODE_ENV=development` with native PowerShell across all endpoints (`/register`, `/login`, `/me`, `/refresh`, `/logout`).

---

## Security Notes

1. **Zero Real Secrets in Source Control:**
   - All JWT secrets, database connection strings, and seed credentials exist solely in the git-ignored root `.env`.
   - `.env.example` provides template placeholders only.
   - Documentation uses `<password from .env>` and never includes plaintext secrets.
2. **Environment-Driven Cookie Security:**
   - In production environments, `Secure` cookie flags are enforced automatically. In development, cookies function over `http://localhost`.
3. **Principle of Least Privilege:**
   - Customer accounts can never attain administrative privileges through public routes. Only authenticated `SUPER_ADMIN` users can register `ADMIN` accounts.

---

## What is Next

Proceed to **Phase 4: Catalog APIs**:

- Public category listing and navigation hierarchy.
- Product listing with cursor/offset pagination, category filters, price range filters, and sort options.
- Product detail retrieval with variants, real-time stock availability, and customer reviews.
- Search with autocomplete backed by MongoDB weighted text indexes.
- Promotional home feed (banners and category highlights).
- Pincode serviceability verification.
- In-memory caching headers for hot catalog reads.
- OpenAPI/Swagger documentation at `/api/docs`.
