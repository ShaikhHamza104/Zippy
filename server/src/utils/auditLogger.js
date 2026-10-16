// server/src/utils/auditLogger.js
import { logger } from '../config/logger.js';
import { prisma } from '../database/prisma.js';

/**
 * Creates an immutable record in the audit_logs table for administrative,
 * security-critical, and credential-lifecycle actions.
 *
 * @param {object} params
 * @param {string|null} [params.userId] - Actor performing the action
 * @param {string} params.action - e.g. CREATE_ADMIN, PASSWORD_CHANGE, PASSWORD_RESET, ROLE_CHANGE
 * @param {string} params.entityType - e.g. USER, SESSION, SYSTEM
 * @param {string|null} [params.entityId] - Target entity identifier
 * @param {object|string|null} [params.details] - Metadata or non-sensitive delta
 * @param {string|null} [params.ipAddress] - Client IP address
 * @returns {Promise<void>}
 */
export const recordAuditLog = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
}) => {
  try {
    let serializedDetails = null;
    if (details !== null && details !== undefined) {
      serializedDetails = typeof details === 'string' ? details : JSON.stringify(details);
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: serializedDetails,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
      },
    });
  } catch (err) {
    // Non-blocking: log warning so business operation completes even if audit logging encounters an issue
    logger.error({ err, action, entityType, entityId }, 'Failed to record entry in audit_logs');
  }
};
