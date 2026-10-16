// client/src/services/errorTracker.js

/**
 * Client-side Error Tracking Adapter.
 * Captures unhandled render exceptions and reports them to Sentry or custom monitoring
 * when VITE_SENTRY_DSN is configured.
 */
class ClientErrorTracker {
  constructor() {
    this.dsn = import.meta.env?.VITE_SENTRY_DSN || null;
    this.environment = import.meta.env?.MODE || 'development';
  }

  /**
   * Captures an unhandled React render error or client exception.
   *
   * @param {Error} error - JavaScript Error object
   * @param {Object} [errorInfo] - React component stack information
   */
  captureException(error, errorInfo = {}) {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Client Exception',
      name: error?.name || 'Error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack || null,
      environment: this.environment,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    if (this.dsn && typeof fetch !== 'undefined') {
      try {
        const dsnUrl = new URL(this.dsn);
        const projectId = dsnUrl.pathname.replace('/', '');
        const sentryHost = dsnUrl.origin;
        const publicKey = dsnUrl.username;

        const endpoint = `${sentryHost}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: Math.random().toString(36).substring(2, 18),
            timestamp: errorDetails.timestamp,
            level: 'error',
            platform: 'javascript',
            environment: this.environment,
            message: errorDetails.message,
            extra: errorDetails,
          }),
        }).catch(() => {
          // Suppress network errors from failing client
        });
      } catch {
        // Fallback
      }
    }

    if (this.environment !== 'production') {
      console.error('[CLIENT OBSERVABILITY] Error captured by ErrorBoundary:', errorDetails);
    }
  }
}

export const clientErrorTracker = new ClientErrorTracker();
export default clientErrorTracker;
