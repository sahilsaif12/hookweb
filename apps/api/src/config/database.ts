/**
 * @file database.ts
 * @description Prisma client singleton. Exports a single shared instance
 * across the entire app to avoid exhausting the database connection pool.
 * In development, query/error/warn logs are enabled for debugging.
 * The global pattern prevents multiple instances during hot reloads.
 *
 * Prisma 7 requires the pg adapter to be passed directly to PrismaClient
 * constructor — unlike older versions where the URL in schema.prisma was enough.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
