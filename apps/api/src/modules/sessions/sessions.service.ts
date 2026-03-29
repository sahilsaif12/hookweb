/**
 * @file sessions.service.ts
 * @description Business logic for session management.
 * Handles creating, fetching, and deleting sessions.
 *
 * Session lifecycle:
 * - Anonymous sessions: created without userId, expire after 24h (TTL in Redis + expiresAt in DB)
 * - Authenticated sessions: created with userId, never expire (expiresAt = null)
 *
 * Redis is used to:
 * - Quickly check if a session/endpoint is active (O(1) lookup)
 * - Store session TTL for anonymous sessions
 *
 * Postgres is the source of truth for all session data and requests.
 */

import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { generateEndpointId } from '../../lib/nanoid';
import { AppError } from '../../middleware/error.middleware';
import type {
  CreateSessionInput,
  CreateSessionResponse,
  GetSessionResponse,
} from './sessions.types';

// Redis key prefix for active sessions
const SESSION_KEY = (endpointId: string) => `session:${endpointId}`;

/**
 * Internal helper — validates a session exists and hasn't expired.
 * Reused across multiple service methods to avoid duplication.
 * Throws 404 if not found, 410 if expired.
 */
const assertSessionExists = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, expiresAt: true, endpointId: true },
  });

  if (!session) {
    throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  // 410 Gone — more accurate than 404 for expired resources
  // Tells the client "it existed but is no longer available"
  if (session.expiresAt && session.expiresAt < new Date()) {
    throw new AppError('Session has expired', 410, 'SESSION_EXPIRED');
  }

  return session;
};

export const sessionsService = {
  /**
   * Create a new webhook endpoint session.
   * Generates a unique endpoint ID, stores it in Redis (with TTL for anon users),
   * and persists the session to Postgres.
   */
  async create(input: CreateSessionInput): Promise<CreateSessionResponse> {
    const endpointId = generateEndpointId();

    // Calculate expiry for anonymous sessions
    // Authenticated users get null (never expires)
    const expiresAt = input.userId
      ? null
      : new Date(Date.now() + env.ANON_SESSION_TTL_HOURS * 60 * 60 * 1000);

    // Create session in Postgres
    const session = await prisma.session.create({
      data: {
        endpointId,
        userId: input.userId ?? null,
        expiresAt,
      },
    });

    // Store in Redis for fast lookup during webhook receives
    // Key: session:{endpointId} → Value: session UUID
    if (expiresAt) {
      // Anonymous session — set TTL in Redis to match DB expiry
      const ttlSeconds = Math.floor(
        (expiresAt.getTime() - Date.now()) / 1000
      );
      await redis.set(SESSION_KEY(endpointId), session.id, 'EX', ttlSeconds);
    } else {
      // Authenticated session — no TTL, persists until manually deleted
      await redis.set(SESSION_KEY(endpointId), session.id);
    }

    return {
      id: session.id,
      endpointId: session.endpointId,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      url: `${env.WEB_URL}/i/${endpointId}`,
    };
  },

  /**
   * Fetch a session by its UUID along with the total request count.
   * Throws 404 if the session doesn't exist or 410 if expired.
   */
  async getById(sessionId: string): Promise<GetSessionResponse> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: { select: { requests: true } },
      },
    });

    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      throw new AppError('Session has expired', 410, 'SESSION_EXPIRED');
    }

    return {
      id: session.id,
      endpointId: session.endpointId,
      userId: session.userId,
      name: session.name,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      requestCount: session._count.requests,
      url: `${env.WEB_URL}/i/${session.endpointId}`,
    };
  },

  /**
   * Fetch a session by its endpoint ID (the nanoid in the URL).
   * Used by the webhook receiver to validate incoming requests.
   * First checks Redis for a fast lookup, falls back to Postgres.
   */
  async getByEndpointId(endpointId: string): Promise<string | null> {
    // Fast path: check Redis first (O(1))
    const sessionId = await redis.get(SESSION_KEY(endpointId));
    if (sessionId) return sessionId;

    // Slow path: check Postgres (session may exist but Redis TTL expired)
    const session = await prisma.session.findUnique({
      where: { endpointId },
      select: { id: true, expiresAt: true },
    });

    if (!session) return null;

    // Session expired — return null
    if (session.expiresAt && session.expiresAt < new Date()) return null;

    return session.id;
  },

  /**
   * Update the display name of a session.
   * Only authenticated users can name their sessions.
   */
  async updateName(sessionId: string, name: string): Promise<void> {
    // Validates existence and expiry before updating
    await assertSessionExists(sessionId);

    await prisma.session.update({
      where: { id: sessionId },
      data: { name },
    });
  },

  /**
   * Delete a session and all its requests (cascade handled by Postgres).
   * Also removes the Redis key immediately so the endpoint stops accepting
   * webhooks right away — don't wait for Redis TTL to expire naturally.
   */
  async delete(sessionId: string): Promise<void> {
    const session = await assertSessionExists(sessionId);

    // Delete from Postgres (cascade removes all WebhookRequests)
    await prisma.session.delete({ where: { id: sessionId } });

    // Remove from Redis immediately
    await redis.del(SESSION_KEY(session.endpointId));
  },

  /**
   * Fetch paginated requests for a session using cursor-based pagination.
   *
   * Validation order:
   * 1. Check session exists and hasn't expired → 404 / 410
   * 2. If cursor provided, resolve it to a receivedAt timestamp
   * 3. Fetch requests older than cursor (or all if no cursor)
   * 4. Return items + nextCursor for the client to request the next page
   *
   * Why cursor-based and not offset?
   * New requests arrive constantly — offset pagination would skip or
   * duplicate requests as the dataset shifts. Cursor is stable.
   *
   * Why fetch limit + 1?
   * We take one extra item to check if there's a next page,
   * then slice it off before returning. Avoids a separate COUNT query.
   */
  async getRequests(
    sessionId: string,
    cursor?: string,
    limit: number = 50
  ) {
    // Step 1 — validate session exists and hasn't expired
    // Throws 404 if not found, 410 if expired
    await assertSessionExists(sessionId);

    // Step 2 — resolve cursor to a timestamp boundary
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorRequest = await prisma.webhookRequest.findUnique({
        where: { id: cursor },
        select: { receivedAt: true },
      });

      if (!cursorRequest) {
        // Cursor points to a request that doesn't exist
        // This can happen if old requests were cleaned up
        // Safe to ignore — just return from the beginning
        cursorDate = undefined;
      } else {
        cursorDate = cursorRequest.receivedAt;
      }
    }

    // Step 3 — fetch requests
    const requests = await prisma.webhookRequest.findMany({
      where: {
        sessionId,
        ...(cursorDate ? { receivedAt: { lt: cursorDate } } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: limit + 1, // fetch one extra to detect next page
    });

    // Step 4 — build paginated response
    const hasNextPage = requests.length > limit;
    const items = hasNextPage ? requests.slice(0, -1) : requests;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items: items.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        method: r.method,
        path: r.path,
        headers: r.headers,
        body: r.body,
        sourceIp: r.sourceIp,
        receivedAt: r.receivedAt.toISOString(),
      })),
      nextCursor,
      hasNextPage,
    };
  },
};
