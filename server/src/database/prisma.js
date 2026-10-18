// server/src/database/prisma.js
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : ['error'],
  });

if (env.NODE_ENV === 'development') {
  prisma.$on('error', (e) => logger.error({ err: e }, 'Prisma Client Error'));
  prisma.$on('warn', (e) => logger.warn({ warning: e }, 'Prisma Client Warning'));
  globalForPrisma.prisma = prisma;
}

export const connectPrisma = async (retryCount = 5, retryDelayMs = 2500) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      logger.info(`Connecting to MySQL Prisma (attempt ${attempt}/${retryCount})...`);
      await prisma.$connect();
      logger.info('Connected to MySQL Prisma successfully');
      return;
    } catch (err) {
      logger.error({ err, attempt }, `Failed to connect to MySQL Prisma on attempt ${attempt}`);
      if (attempt === retryCount) {
        throw new Error(`Prisma connection failed after ${retryCount} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from MySQL Prisma');
};

export default prisma;
