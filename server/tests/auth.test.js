// server/tests/auth.test.js
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongo.js';
import { prisma } from '../src/database/prisma.js';
import { hashPassword } from '../src/utils/password.js';
import {
  generateAccessToken,
  generatePasswordResetToken,
  hashToken,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../src/utils/tokens.js';

describe('Phase 3: Authentication and Security Core Test Suite', () => {
  const timestamp = Date.now();
  const testCustomerEmail = `test_customer_${timestamp}@zippy.test`;
  const testCustomerPassword = 'StrongCustomerPassword#2026';
  const testAdminEmail = `test_admin_${timestamp}@zippy.test`;
  const testAdminPassword = 'StrongAdminPassword#2026';

  let superAdminUser;
  let superAdminToken;

  beforeAll(async () => {
    await connectMongoDB();

    // Retrieve or seed super admin for admin delegation tests
    superAdminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!superAdminUser) {
      const pwdHash = await hashPassword('SuperAdminTestPass#2026');
      superAdminUser = await prisma.user.create({
        data: {
          name: 'Super Admin Test',
          email: `superadmin_${timestamp}@zippy.test`,
          passwordHash: pwdHash,
          role: 'SUPER_ADMIN',
          emailVerified: true,
        },
      });
    }

    superAdminToken = generateAccessToken(superAdminUser);
  });

  afterAll(async () => {
    // Cleanup users created during test suite
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: `_${timestamp}@zippy.test`,
          },
        },
      });
    } catch {
      // Ignore cleanup error
    }

    await disconnectMongoDB();
    await prisma.$disconnect();
  });

  describe('0. API Discovery Route', () => {
    it('returns 200 with available authentication endpoints map', async () => {
      const res = await request(app).get('/api/v1/auth');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints.register.method).toBe('POST');
      expect(res.body.endpoints.login.method).toBe('POST');
      expect(res.body.endpoints.me.method).toBe('GET');
    });
  });

  describe('1. Customer Registration & Password Policy', () => {
    it('successfully registers a customer, sets role CUSTOMER, and issues refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Customer',
          email: testCustomerEmail,
          phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
          password: testCustomerPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testCustomerEmail);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      // Check refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const hasRefreshCookie = cookies.some((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));
      expect(hasRefreshCookie).toBe(true);
    });

    it('rejects registration when password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Pass User',
          email: `short_${timestamp}@zippy.test`,
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/VALIDATION_ERROR|WEAK_PASSWORD/);
    });

    it('rejects registration when password is in the common passwords blacklist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Common Pass User',
          email: `common_${timestamp}@zippy.test`,
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
      expect(res.body.error.message).toMatch(/too common/i);
    });

    it('rejects registration when email already exists', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate Email User',
        email: testCustomerEmail,
        password: 'AnotherStrongPassword#2026',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('prevents role escalation attack: ignores or strips role in public register', async () => {
      const evilEmail = `evil_hacker_${timestamp}@zippy.test`;
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Evil Hacker',
        email: evilEmail,
        password: 'StrongHackerPass#2026',
        role: 'SUPER_ADMIN', // Injected escalation field
      });

      // Zod schema is strict() so extraneous fields fail validation with 400
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Verify user was NOT created
      const hackerUser = await prisma.user.findUnique({ where: { email: evilEmail } });
      expect(hackerUser).toBeNull();
    });
  });

  describe('2. Role-Based Access Control & Admin Creation', () => {
    it('forbids unauthenticated access to /api/v1/auth/create-admin', async () => {
      const res = await request(app).post('/api/v1/auth/create-admin').send({
        name: 'Test Admin',
        email: testAdminEmail,
        password: testAdminPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('forbids a CUSTOMER from creating an ADMIN account', async () => {
      // Login as customer to get access token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      const customerToken = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/create-admin')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Admin',
          email: testAdminEmail,
          password: testAdminPassword,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows a SUPER_ADMIN to create an ADMIN account and logs audit event', async () => {
      const res = await request(app)
        .post('/api/v1/auth/create-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Store Admin',
          email: testAdminEmail,
          password: testAdminPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testAdminEmail);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.emailVerified).toBe(true);

      // Verify audit log record exists
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'CREATE_ADMIN',
          entityId: res.body.data.user.id,
        },
      });
      expect(auditEntry).toBeDefined();
    });
  });

  describe('3. Login, Timing Attack Mitigation, and Account Lockout', () => {
    it('successfully logs in with valid credentials and records login log', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testCustomerEmail);

      // Verify login log in DB
      const loginRecord = await prisma.loginLog.findFirst({
        where: { email: testCustomerEmail, success: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(loginRecord).toBeDefined();
    });

    it('returns generic error on wrong password without user enumeration', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: 'IncorrectPassword#999',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('returns identical generic error on non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `non_existent_${timestamp}@zippy.test`,
          password: 'SomeRandomPassword#999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('locks out account after 5 failed login attempts', async () => {
      const bruteUserEmail = `brute_${timestamp}@zippy.test`;
      const brutePass = 'BruteSafePassword#2026';

      // Register a user for brute force testing
      await request(app).post('/api/v1/auth/register').send({
        name: 'Brute Force Target',
        email: bruteUserEmail,
        password: brutePass,
      });

      // 5 consecutive wrong password attempts
      for (let i = 1; i <= 5; i++) {
        const attemptRes = await request(app).post('/api/v1/auth/login').send({
          email: bruteUserEmail,
          password: 'WrongPassword#123',
        });
        expect(attemptRes.status).toBe(401);
      }

      // 6th attempt must be locked out with 423
      const lockedRes = await request(app).post('/api/v1/auth/login').send({
        email: bruteUserEmail,
        password: brutePass, // Even with correct password, account is locked!
      });

      expect(lockedRes.status).toBe(423);
      expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(lockedRes.body.error.message).toMatch(/temporarily locked/i);
    });

    it('forbids login if user isBlocked', async () => {
      const blockedEmail = `blocked_${timestamp}@zippy.test`;
      const blockedPass = 'BlockedPassword#2026';

      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Blocked User',
        email: blockedEmail,
        password: blockedPass,
      });

      await prisma.user.update({
        where: { id: regRes.body.data.user.id },
        data: { isBlocked: true },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: blockedEmail,
        password: blockedPass,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
    });
  });

  describe('4. Token Security, Expiration, and Tampering Attacks', () => {
    it('returns current user profile on GET /api/v1/auth/me', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      const token = loginRes.body.data.accessToken;

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testCustomerEmail);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects access when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects tampered JWT signature attack', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      const validToken = loginRes.body.data.accessToken;

      // Tamper with signature part
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature_payload`;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects expired JWT access token', async () => {
      // Craft an expired JWT using access secret
      const expiredToken = jwt.sign(
        {
          sub: superAdminUser.id,
          email: superAdminUser.email,
          role: superAdminUser.role,
        },
        env.JWT_ACCESS_SECRET,
        {
          expiresIn: '-1s',
          issuer: 'zippy-api',
          audience: 'zippy-client',
        }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('5. CSRF Defense on Cookie Endpoints', () => {
    it('blocks refresh request missing custom CSRF header', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=any_token`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_VALIDATION_FAILED');
    });

    it('blocks logout request missing custom CSRF header', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=any_token`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_VALIDATION_FAILED');
    });
  });

  describe('6. Refresh Token Rotation and Reuse Attack Mitigation', () => {
    it('rotates refresh token and returns new access token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });

      const setCookie = loginRes.headers['set-cookie'];
      const rawCookie = setCookie.find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));
      const refreshToken = rawCookie.split(';')[0].split('=')[1];

      // Refresh call with valid CSRF header
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      // Check rotated new cookie issued
      const newCookies = refreshRes.headers['set-cookie'];
      const newRawCookie = newCookies.find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));
      const newRefreshToken = newRawCookie.split(';')[0].split('=')[1];

      expect(newRefreshToken).not.toBe(refreshToken);

      // Verify old token is marked revoked in DB
      const oldTokenHash = hashToken(refreshToken);
      const oldDbRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash: oldTokenHash },
      });
      expect(oldDbRecord.isRevoked).toBe(true);
    });

    it('REUSE ATTACK: revokes entire token family when an already-revoked token is presented', async () => {
      // 1. Login to establish a fresh family
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      const cookie1 = loginRes.headers['set-cookie']
        .find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
        .split(';')[0]
        .split('=')[1];

      // 2. Normal rotation: cookie1 -> cookie2
      const rotRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${cookie1}`)
        .set('X-Zippy-Client', 'web');

      expect(rotRes.status).toBe(200);
      const cookie2 = rotRes.headers['set-cookie']
        .find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
        .split(';')[0]
        .split('=')[1];

      // 3. Attacker replays stolen/old cookie1
      const attackRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${cookie1}`)
        .set('X-Zippy-Client', 'web');

      expect(attackRes.status).toBe(403);
      expect(attackRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // 4. Legitimate user tries using cookie2 - it MUST also be revoked now!
      const userRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${cookie2}`)
        .set('X-Zippy-Client', 'web');

      expect(userRes.status).toBe(403);
      expect(userRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // 5. Verify audit log entry exists for this reuse detection
      const auditEntry = await prisma.auditLog.findFirst({
        where: { action: 'REFRESH_TOKEN_REUSE_DETECTED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditEntry).toBeDefined();
    });
  });

  describe('7. Logout Flow', () => {
    it('revokes refresh token and clears cookie on logout', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      const rawCookie = loginRes.headers['set-cookie']
        .find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
        .split(';')[0]
        .split('=')[1];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${rawCookie}`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toMatch(/logged out successfully/i);

      // Verify token is revoked in DB
      const tokenHash = hashToken(rawCookie);
      const dbRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });
      expect(dbRecord.isRevoked).toBe(true);

      // Subsequent refresh attempt must fail
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${rawCookie}`)
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(refreshAttempt.status).toBe(403); // Revoked token reuse detected
    });
  });

  describe('8. Forgot Password, Reset Password, and Change Password', () => {
    it('forgot-password returns identical message whether email exists or not', async () => {
      const resReal = await request(app).post('/api/v1/auth/forgot-password').send({
        email: testCustomerEmail,
      });
      expect(resReal.status).toBe(200);
      expect(resReal.body.message).toMatch(/If an account with that email exists/i);

      const resFake = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: `does_not_exist_${timestamp}@zippy.test`,
        });
      expect(resFake.status).toBe(200);
      expect(resFake.body.message).toBe(resReal.body.message);
    });

    it('resets password using valid reset token and revokes active sessions', async () => {
      const user = await prisma.user.findUnique({ where: { email: testCustomerEmail } });
      const resetToken = generatePasswordResetToken(user);
      const newPassword = 'BrandNewPassword#2026';

      const res = await request(app).post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Password has been reset successfully/i);

      // Verify old password no longer works
      const oldLogin = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: testCustomerPassword,
      });
      expect(oldLogin.status).toBe(401);

      // Verify new password works
      const newLogin = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: newPassword,
      });
      expect(newLogin.status).toBe(200);

      // Verify token replay attack fails (token is single-use because passwordHash changed)
      const replayRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: 'AnotherPassword#2026',
      });
      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('EXPIRED_RESET_TOKEN');
    });

    it('changes password for authenticated user and revokes sessions', async () => {
      const activePassword = 'BrandNewPassword#2026';
      const updatedPassword = 'FinalChangedPassword#2026';

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: activePassword,
      });
      const token = loginRes.body.data.accessToken;

      // Fails if current password incorrect
      const failRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongCurrentPassword#999',
          newPassword: updatedPassword,
        });
      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

      // Succeeds with correct current password
      const successRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: activePassword,
          newPassword: updatedPassword,
        });
      expect(successRes.status).toBe(200);

      // Verify login with updated password
      const newLogin = await request(app).post('/api/v1/auth/login').send({
        email: testCustomerEmail,
        password: updatedPassword,
      });
      expect(newLogin.status).toBe(200);
    });
  });

  describe('9. Email Verification Flow', () => {
    it('verifies email with valid verification token', async () => {
      const unverifiedEmail = `unverified_${timestamp}@zippy.test`;
      const regRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Unverified Customer',
        email: unverifiedEmail,
        password: 'UnverifiedPassword#2026',
      });
      expect(regRes.body.data.user.emailVerified).toBe(false);

      const user = await prisma.user.findUnique({ where: { email: unverifiedEmail } });
      const verifyToken = jwt.sign(
        { sub: user.id, email: user.email, type: 'email_verification' },
        env.JWT_EMAIL_VERIFICATION_SECRET,
        { expiresIn: '24h', issuer: 'zippy-api' }
      );

      const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
        token: verifyToken,
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.message).toMatch(/verified successfully/i);

      // Verify in DB
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser.emailVerified).toBe(true);
    });

    it('rejects invalid or tampered email verification token', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        token: 'invalid_verification_token_signature',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });
});
