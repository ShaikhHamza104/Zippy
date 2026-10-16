// server/src/config/securityGuards.js

const COMMON_WEAK_PASSWORDS = new Set([
  'root@123',
  'admin123',
  'password',
  'password123',
  'admin',
  'root',
  '12345678',
  '123456789',
  'qwerty12345',
]);

/**
 * Validates super admin credentials against security criteria.
 * In production: throws fatal error and terminates execution if insecure.
 * In development: logs a visible security warning.
 */
export const validateSuperAdminSecurity = (
  email = process.env.SUPER_ADMIN_EMAIL,
  password = process.env.SUPER_ADMIN_PASSWORD,
  nodeEnv = process.env.NODE_ENV || 'development'
) => {
  // If not configured, skip unless required
  if (!email && !password) return;

  const isPasswordWeak =
    !password || password.length < 12 || COMMON_WEAK_PASSWORDS.has(password.toLowerCase().trim());

  const isEmailDevDomain =
    email &&
    (email.toLowerCase().endsWith('.local') ||
      email.toLowerCase().endsWith('.test') ||
      email.toLowerCase().endsWith('.example'));

  if (nodeEnv === 'production') {
    if (isPasswordWeak) {
      throw new Error(
        '[SECURITY FATAL] Weak SUPER_ADMIN_PASSWORD detected in production mode. ' +
          'Production passwords must be at least 12 characters long and cannot be a common dictionary password.'
      );
    }
    if (isEmailDevDomain) {
      throw new Error(
        `[SECURITY FATAL] Insecure SUPER_ADMIN_EMAIL detected in production mode: "${email}". ` +
          'Production email cannot end in .local, .test, or .example.'
      );
    }
  } else {
    if (isPasswordWeak) {
      console.warn(
        '[SECURITY WARNING] Weak SUPER_ADMIN_PASSWORD in use for development. ' +
          'A strong, random password must be configured before production deployment.'
      );
    }
    if (isEmailDevDomain) {
      console.warn(`[SECURITY WARNING] Non-production SUPER_ADMIN_EMAIL in use: "${email}".`);
    }
  }
};
