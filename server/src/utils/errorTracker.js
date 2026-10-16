// server/src/utils/errorTracker.js
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Enterprise error-tracking adapter.
 * Connects to Sentry, Datadog, or external incident monitoring when SENTRY_DSN is configured.
 * Defaults to structured high-priority Pino error logging in development/test.
 */
class ErrorTracker {
  constructor() {
    this.dsn = process.env.SENTRY_DSN || null;
    this.environment = env?.NODE_ENV || 'development';
    this.isEnabled = !!this.dsn;

    if (this.isEnabled) {
      logger.info(
        { environment: this.environment },
        '[OBSERVABILITY] Sentry error tracking adapter initialized'
      );
    }
  }

  /**
   * Captures an unhandled exception or operational 5xx error.
   *
   * @param {Error} err - Error instance
   * @param {Object} [context] - Contextual metadata (requestId, user, route, query)
   */
  captureException(err, context = {}) {
    const errorPayload = {
      timestamp: new Date().toISOString(),
      name: err.name || 'Error',
      message: err.message || 'Unknown error',
      stack: err.stack,
      environment: this.environment,
      requestId: context.requestId || null,
      userId: context.userId || context.user?.id || null,
      userRole: context.user?.role || null,
      method: context.method || null,
      url: context.url || null,
      statusCode: context.statusCode || 500,
    };

    if (this.isEnabled) {
      // In production with SENTRY_DSN configured, forward via HTTPS envelope or webhook
      this._sendToSentry(errorPayload).catch((postErr) => {
        logger.warn(
          { postErr: postErr.message },
          '[OBSERVABILITY] Failed to forward error to Sentry DSN'
        );
      });
    }

    // Always log structured error in server logs
    logger.error(errorPayload, `[OBSERVABILITY] Error captured: ${err.message}`);
  }

  /**
   * Captures a notable application warning or security incident message.
   *
   * @param {string} message - Informational or warning message
   * @param {string} [level='warn'] - Severity level
   * @param {Object} [context] - Contextual metadata
   */
  captureMessage(message, level = 'warn', context = {}) {
    const logPayload = {
      timestamp: new Date().toISOString(),
      message,
      level,
      environment: this.environment,
      ...context,
    };

    if (this.isEnabled) {
      this._sendToSentry(logPayload).catch((postErr) => {
        logger.warn(
          { postErr: postErr.message },
          '[OBSERVABILITY] Failed to forward message to Sentry DSN'
        );
      });
    }

    logger[level]
      ? logger[level](logPayload, `[OBSERVABILITY] ${message}`)
      : logger.warn(logPayload, message);
  }

  /**
   * Sends error payload to Sentry DSN endpoint using native fetch.
   *
   * @private
   */
  async _sendToSentry(payload) {
    if (!this.dsn || typeof fetch === 'undefined') return;

    try {
      const dsnUrl = new URL(this.dsn);
      const projectId = dsnUrl.pathname.replace('/', '');
      const sentryHost = dsnUrl.origin;
      const publicKey = dsnUrl.username;

      const endpoint = `${sentryHost}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'zippy-server-error-tracker/1.0',
        },
        body: JSON.stringify({
          event_id: (payload.requestId || crypto.randomUUID()).replace(/-/g, ''),
          timestamp: payload.timestamp,
          level: payload.statusCode >= 500 ? 'error' : 'warning',
          platform: 'node',
          environment: payload.environment,
          message: payload.message,
          extra: payload,
        }),
      });
    } catch (err) {
      // Suppress network errors from crashing the app
      logger.debug({ err: err.message }, '[OBSERVABILITY] Remote Sentry reporting skipped');
    }
  }
}

export const errorTracker = new ErrorTracker();
export default errorTracker;
