/**
 * @file ratelimit.middleware.ts
 * @description Redis-based sliding window rate limiter.
 * Tracks requests per endpointId using a Redis sorted set (ZSET).
 * Each request is stored with its timestamp as the score.
 * Old entries outside the window are pruned on every request.
 * Returns 429 Too Many Requests when the limit is exceeded.
 *
 * How sliding window works:
 * - Every incoming request gets added to a ZSET with current timestamp as score
 * - Before counting, we remove all entries older than (now - windowMs)
 * - If remaining count > limit → reject with 429
 * - This means the window "slides" with time — not fixed to clock minutes
 *
 * Example:
 * - Limit: 100 req/min
 * - At 12:00:30 we received 100 requests
 * - At 12:00:45 a new request comes in
 * - We remove entries before 11:59:45 (60s ago)
 * - Count remaining → if still 100 → reject
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { env } from '../config/env';

export const rateLimitEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get the endpoint ID from the URL params e.g. /i/:id
  const endpointId = req.params.id;

  // If no endpoint ID found, skip rate limiting
  if (!endpointId) return next();

  // Redis key unique per endpoint — rl:x7k2m9pq
  const key = `rl:${endpointId}`;

  // Current timestamp in milliseconds
  const now = Date.now();

  // Start of the sliding window — everything before this is expired
  const windowStart = now - env.RATE_LIMIT_WINDOW_MS;

  try {
    // Use a pipeline to batch all Redis commands into one round trip
    // Instead of 4 separate network calls, we send all 4 at once
    const pipeline = redis.pipeline();

    // Step 1: Remove all entries older than the window start
    // ZREMRANGEBYSCORE key -inf <windowStart>
    // This is what makes it a "sliding" window — stale entries are pruned first
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Step 2: Add the current request to the ZSET
    // Score = current timestamp (used for range queries)
    // Value = timestamp + random suffix to ensure uniqueness
    // (ZSET members must be unique — two requests at exact same ms would collide)
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Step 3: Count how many requests are in the current window
    // ZCARD returns the total number of members in the ZSET
    pipeline.zcard(key);

    // Step 4: Set TTL on the key so it auto-expires from Redis
    // Without this, keys for deleted/expired sessions would stay in Redis forever
    pipeline.expire(key, Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000));

    // Execute all 4 commands at once
    const results = await pipeline.exec();

    // Result index 2 = response from ZCARD (the count)
    const count = results?.[2]?.[1] as number;

    // If count exceeds the limit, reject the request
    if (count > env.RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        // Tell the client how long to wait before retrying (in seconds)
        retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    // Under the limit — allow the request through
    next();
  } catch (err) {
    // If Redis is down, fail open (allow the request)
    // Better to serve traffic than block everything because Redis hiccuped
    next();
  }
};
