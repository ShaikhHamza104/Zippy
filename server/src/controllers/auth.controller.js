// server/src/controllers/auth.controller.js
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma.js';
import { logger } from '../config/logger.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email.service.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { recordLoginLog } from '../utils/loginLogger.js';
import {
  comparePassword,
  compareTimingSafeDummy,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/password.js';
import {
  generateAccessToken,
  generateEmailVerificationToken,
  generateOpaqueRefreshToken,
  generatePasswordResetToken,
  getRefreshTokenCookieOptions,
  hashToken,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_DAYS,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
} from '../utils/tokens.js';

/**
 * Sanitizes user record by omitting sensitive hash attributes.
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

/**
 * Public Customer Registration
 * Enforces password policy, ensures unique email/phone, creates CUSTOMER role only.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    // 1. Enforce password policy
    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: policyResult.error,
        },
      });
    }

    // 2. Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
    }

    // 3. Check duplicate phone if provided
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PHONE_ALREADY_EXISTS',
            message: 'An account with this phone number already exists.',
          },
        });
      }
    }

    // 4. Hash password with bcrypt cost 12
    const passwordHash = await hashPassword(password);

    // 5. Create CUSTOMER user in MySQL
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: 'CUSTOMER',
        emailVerified: false,
      },
    });

    // 6. Generate email verification token and trigger email dispatch
    const verificationToken = generateEmailVerificationToken(user);
    try {
      await sendVerificationEmail(user.email, {
        verificationToken,
        name: user.name,
      });
    } catch (emailErr) {
      // Non-fatal: log error so customer registration still succeeds even if email transport experiences an issue
      logger.error(
        { err: emailErr, email: user.email },
        'Failed to deliver customer verification email during registration'
      );
    }

    // 7. Issue session: Access token + rotating refresh token in cookie
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, getRefreshTokenCookieOptions());

    // 8. Audit and Login log
    await recordAuditLog({
      userId: user.id,
      action: 'REGISTER_CUSTOMER',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
    });

    await recordLoginLog({
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent: req.headers['user-agent'] || null,
      success: true,
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * User Login
 * Mitigates user enumeration, constant-time dummy comparisons, tracks 5-attempt account lockout.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 1. If user does not exist, perform dummy comparison to prevent timing enumeration
    if (!user) {
      await compareTimingSafeDummy(password);
      await recordLoginLog({
        userId: null,
        email,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'INVALID_CREDENTIALS',
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // 2. Reject soft-deleted users
    if (user.deletedAt) {
      await compareTimingSafeDummy(password);
      await recordLoginLog({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'ACCOUNT_DEACTIVATED',
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'This account has been deactivated.',
        },
      });
    }

    // 3. Reject suspended/blocked users
    if (user.isBlocked) {
      await compareTimingSafeDummy(password);
      await recordLoginLog({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'ACCOUNT_BLOCKED',
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_BLOCKED',
          message: 'Your account has been suspended. Please contact support.',
        },
      });
    }

    // 4. Check account lockout status
    const now = new Date();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      await compareTimingSafeDummy(password);
      await recordLoginLog({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'ACCOUNT_LOCKED',
      });
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message:
            'Account is temporarily locked due to repeated failed login attempts. Please try again after 15 minutes.',
        },
      });
    }

    // 5. Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockoutUntil = null;

      if (failedAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        await recordAuditLog({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          entityType: 'USER',
          entityId: user.id,
          details: { failedAttempts, lockoutUntil },
          ipAddress,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockoutUntil,
        },
      });

      await recordLoginLog({
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        success: false,
        failReason: 'INVALID_CREDENTIALS',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // 6. Successful login: reset failed login attempts and lockout
    if (user.failedLoginAttempts > 0 || user.lockoutUntil !== null) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      });
    }

    // 7. Issue session: Access token + new refresh token in cookie
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken, getRefreshTokenCookieOptions());

    await recordLoginLog({
      userId: user.id,
      email,
      ipAddress,
      userAgent,
      success: true,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh Session
 * Implements token rotation and family-wide reuse detection.
 */
export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token cookie is missing.',
        },
      });
    }

    const tokenHash = hashToken(rawRefreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // 1. Token not found
    if (!tokenRecord) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 0,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or unrecognized refresh token.',
        },
      });
    }

    // 2. REUSE DETECTION: If token is already revoked, someone is replaying a stolen/expired token!
    if (tokenRecord.isRevoked) {
      // Invalidate the ENTIRE token family immediately
      await prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { isRevoked: true },
      });

      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 0,
      });

      await recordAuditLog({
        userId: tokenRecord.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityType: 'SESSION',
        entityId: tokenRecord.familyId,
        details: { tokenRecordId: tokenRecord.id },
        ipAddress,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'TOKEN_REUSE_DETECTED',
          message:
            'Security violation detected: refresh token reuse. All active sessions in this family have been terminated.',
        },
      });
    }

    // 3. Expiration check
    if (tokenRecord.expiresAt < new Date()) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });

      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 0,
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired. Please log in again.',
        },
      });
    }

    // 4. Verify user integrity
    const { user } = tokenRecord;
    if (!user || user.isBlocked || user.deletedAt) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 0,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'User account is deactivated or blocked.',
        },
      });
    }

    // 5. ROTATION: Invalidate current token, issue replacement token in the SAME family
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const newRawRefreshToken = generateOpaqueRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        familyId: tokenRecord.familyId,
        expiresAt,
      },
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRawRefreshToken, getRefreshTokenCookieOptions());

    const accessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout
 * Revokes refresh token in database and clears cookie.
 */
export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      ...getRefreshTokenCookieOptions(),
      maxAge: 0,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Forgot Password
 * Prevents enumeration: returns generic success message whether user exists or not.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && !user.deletedAt && !user.isBlocked) {
      const resetToken = generatePasswordResetToken(user);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await sendPasswordResetEmail(user.email, {
        resetToken,
        otp,
        name: user.name,
      });

      await recordAuditLog({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
      });
    }

    // Always respond with identical message to eliminate user enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset Password
 * Verifies single-use cryptographic reset token, validates password policy, revokes prior sessions.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    // 1. Decode token to find user
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.sub || decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or malformed password reset token.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.deletedAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Invalid or expired password reset token.',
        },
      });
    }

    // 2. Cryptographically verify signature using key tied to user's passwordHash
    try {
      verifyPasswordResetToken(token, user);
    } catch {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPIRED_RESET_TOKEN',
          message: 'Password reset token has expired or has already been used.',
        },
      });
    }

    // 3. Enforce password policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: policyResult.error,
        },
      });
    }

    // 4. Hash new password with bcrypt cost 12
    const passwordHash = await hashPassword(newPassword);

    // 5. Update user password and reset lockout counters
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    // 6. Revoke all active refresh sessions for this user
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Change Password
 * Authenticated user endpoint. Verifies current password, enforces policy, revokes sessions.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const user = req.user;

    // 1. Verify current password
    const isCurrentValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'The current password you entered is incorrect.',
        },
      });
    }

    // 2. Validate new password against policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: policyResult.error,
        },
      });
    }

    // 3. Hash new password
    const passwordHash = await hashPassword(newPassword);

    // 4. Update in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 5. Revoke active refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new credentials.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Email
 * Validates email verification token and marks emailVerified: true.
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.body?.token || req.query?.token;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Verification token is required.',
        },
      });
    }

    let payload;
    try {
      payload = verifyEmailVerificationToken(token);
    } catch {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERIFICATION_TOKEN',
          message: 'Verification token is invalid or has expired.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
      });
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      await recordAuditLog({
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email address has been verified successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Current User Profile (me)
 */
export const me = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Admin User
 * Strictly restricted to SUPER_ADMIN callers.
 */
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    // 1. Enforce password policy
    const policyResult = validatePasswordPolicy(password);
    if (!policyResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: policyResult.error,
        },
      });
    }

    // 2. Check duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
    }

    // 3. Check duplicate phone if provided
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'PHONE_ALREADY_EXISTS',
            message: 'An account with this phone number already exists.',
          },
        });
      }
    }

    // 4. Hash password with bcrypt cost 12
    const passwordHash = await hashPassword(password);

    // 5. Create ADMIN in MySQL
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true, // Created directly by Super Admin
      },
    });

    // 6. Record audit log
    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_ADMIN',
      entityType: 'USER',
      entityId: newAdmin.id,
      details: { email: newAdmin.email, role: 'ADMIN' },
      ipAddress,
    });

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(newAdmin),
      },
    });
  } catch (err) {
    next(err);
  }
};
