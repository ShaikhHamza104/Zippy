import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Zippy API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Close accepting new connections
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
      process.exit(1);
    }
    logger.info('HTTP server closed successfully. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after timeout if pending connections do not drain
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception thrown');
  process.exit(1);
});
