// server/src/utils/tokens.js
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env, isCookieSecure } from '../config/env.js';

export const REFRESH_TOKEN_COOKIE_NAME = 'zippy_refresh';
export const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
export const REFRESH_TOKEN_DAYS = 30; // 30 days
export const RESET_PASSWORD_EXPIRY = '15m'; // 15 minutes
export const EMAIL_VERIFICATION_EXPIRY = '24h'; // 24 hours

/**
 * Returns cookie options for the refresh token.
 * Secure flag is driven by environment (true in production, false for local dev).
 * SameSite is driven by COOKIE_SAMESITE (defaults to 'lax', supports 'none' for cross-domain deployments).
 * Note: If sameSite is 'none', secure MUST be true per browser specifications.
 * @returns {import('express').CookieOptions}
 */
export const getRefreshTokenCookieOptions = () => {
  const secure = isCookieSecure();
  let sameSite = env.COOKIE_SAMESITE || 'lax';

  // Cross-site cookies (SameSite=None) strictly require the Secure flag in all modern browsers
  if (sameSite === 'none' && !secure) {
    sameSite = 'lax';
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  };
};

/**
 * Generates a short-lived (15 min) JWT access token.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string} JWT access token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'zippy-api',
      audience: 'zippy-client',
    }
  );
};

/**
 * Verifies and decodes a JWT access token.
 * @param {string} token
 * @returns {{ sub: string, email: string, role: string, iat: number, exp: number }}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'zippy-api',
    audience: 'zippy-client',
  });
};

/**
 * Generates a cryptographically strong random opaque refresh token.
 * @returns {string} 80-character hex string
 */
export const generateOpaqueRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Produces a SHA-256 hash of an opaque token for safe database persistence.
 * @param {string} token
 * @returns {string} 64-character SHA-256 hex digest
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generates a single-use password reset token.
 * Incorporates the user's current passwordHash into the signing key so that
 * any prior reset tokens become immediately invalid once the password is changed.
 *
 * @param {{ id: string, email: string, passwordHash: string }} user
 * @returns {string} Signed JWT reset token
 */
export const generatePasswordResetToken = (user) => {
  const secret = `${env.JWT_RESET_PASSWORD_SECRET}:${user.passwordHash}`;
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'password_reset',
    },
    secret,
    {
      expiresIn: RESET_PASSWORD_EXPIRY,
      issuer: 'zippy-api',
    }
  );
};

/**
 * Verifies a password reset token against the user's current password hash.
 * @param {string} token
 * @param {{ id: string, email: string, passwordHash: string }} user
 * @returns {{ sub: string, email: string, type: string }}
 */
export const verifyPasswordResetToken = (token, user) => {
  const secret = `${env.JWT_RESET_PASSWORD_SECRET}:${user.passwordHash}`;
  return jwt.verify(token, secret, {
    issuer: 'zippy-api',
  });
};

/**
 * Generates an email verification token.
 * @param {{ id: string, email: string }} user
 * @returns {string} Signed JWT verification token
 */
export const generateEmailVerificationToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'email_verification',
    },
    env.JWT_EMAIL_VERIFICATION_SECRET,
    {
      expiresIn: EMAIL_VERIFICATION_EXPIRY,
      issuer: 'zippy-api',
    }
  );
};

/**
 * Verifies an email verification token.
 * @param {string} token
 * @returns {{ sub: string, email: string, type: string }}
 */
export const verifyEmailVerificationToken = (token) => {
  return jwt.verify(token, env.JWT_EMAIL_VERIFICATION_SECRET, {
    issuer: 'zippy-api',
  });
};
