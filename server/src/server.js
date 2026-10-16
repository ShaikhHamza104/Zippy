import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectMongoDB, disconnectMongoDB } from './database/mongo.js';
import { prisma } from './database/prisma.js';

let server;

// Initialize database connections and start HTTP listener
const startServer = async () => {
  try {
    await connectMongoDB();
    await prisma.$connect();
    logger.info('Database connections established (MySQL Prisma & MongoDB Mongoose)');

    server = app.listen(env.PORT, () => {
      logger.info(`Zippy API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to initialize database connections during startup');
    process.exit(1);
  }
};

startServer();

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  if (!server) {
    process.exit(0);
  }

  // Close accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
    }
    try {
      await disconnectMongoDB();
      await prisma.$disconnect();
      logger.info('Database connections closed cleanly.');
    } catch (dbErr) {
      logger.error({ dbErr }, 'Error closing database connections during shutdown');
    }
    logger.info('HTTP server closed successfully. Exiting process.');
    process.exit(err ? 1 : 0);
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
