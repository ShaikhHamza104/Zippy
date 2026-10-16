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

export default prisma;
