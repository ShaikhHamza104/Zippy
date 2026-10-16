// server/src/utils/loginLogger.js
import { logger } from '../config/logger.js';
import { prisma } from '../database/prisma.js';

/**
 * Records an authentication attempt into the login_logs MySQL table.
 *
 * @param {object} params
 * @param {string|null} [params.userId]
 * @param {string} params.email
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @param {boolean} params.success
 * @param {string|null} [params.failReason]
 * @returns {Promise<void>}
 */
export const recordLoginLog = async ({
  userId = null,
  email,
  ipAddress = null,
  userAgent = null,
  success,
  failReason = null,
}) => {
  try {
    await prisma.loginLog.create({
      data: {
        userId,
        email,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        success,
        failReason,
      },
    });
  } catch (err) {
    // Non-blocking: log warning if persistence fails so auth request is not aborted
    logger.warn({ err, email, success }, 'Failed to record entry in login_logs');
  }
};
