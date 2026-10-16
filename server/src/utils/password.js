// server/src/utils/password.js
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

// Static pre-hashed dummy string used for constant-time comparisons when email is not found
// Generated with bcrypt cost 12: "$2a$12$e8qW7.U4r2q30e1y3LgD.O5WqVzJv1c2Xb3Z4a5s6d7f8g9h0j1k2"
const DUMMY_HASH = '$2a$12$e8qW7.U4r2q30e1y3LgD.O5WqVzJv1c2Xb3Z4a5s6d7f8g9h0j1k2';

// Set of common weak passwords prohibited for customers and admins
export const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'root@123',
  'welcome123',
  'letmein123',
  'zippy1234',
  'iloveyou',
  'monkey123',
  'dragon123',
]);

/**
 * Validates a password against customer/admin registration & change password policy.
 * Requirements:
 * - Minimum 8 characters
 * - Not in common passwords blacklist
 *
 * @param {string} password
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must not exceed 128 characters' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return {
      isValid: false,
      error: 'Password is too common and easily guessed. Please choose a stronger password.',
    };
  }

  return { isValid: true };
};

/**
 * Hashes a plaintext password using bcrypt with salt rounds 12.
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compares plaintext password with stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Executes a dummy comparison to mitigate timing attacks when a user is not found.
 * @param {string} password
 * @returns {Promise<boolean>} Always returns false
 */
export const compareTimingSafeDummy = async (password) => {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
};
