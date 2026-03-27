/**
 * @file database.ts
 * @description Prisma client singleton. Exports a single shared instance
 * across the entire app to avoid exhausting the database connection pool.
 * In development, query/error/warn logs are enabled for debugging.
 * The global pattern prevents multiple instances during hot reloads.
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
