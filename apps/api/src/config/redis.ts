/**
 * @file redis.ts
 * @description Creates and exports two Redis clients:
 * - `redis`    — general purpose client for get/set/zadd/expire etc.
 * - `redisSub` — dedicated subscriber client for pub/sub.
 *
 * Two separate clients are required because a Redis client in pub/sub
 * mode cannot execute regular commands — it is locked to subscribe/unsubscribe only.
 * Both clients auto-reconnect with exponential backoff up to 3 retries.
 */

import { Redis } from "ioredis";
import { env } from "./env";

const createRedisClient = (name: string) => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.error(
          ` Redis (${name}) connection failed after ${times} retries`,
        );
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  });

  client.on("connect", () => console.log(`Redis (${name}) connected`));
  client.on("error", (err) =>
    console.error(` Redis (${name}) error:`, err.message),
  );

  return client;
};

// General purpose client
export const redis = createRedisClient("main");

// Dedicated pub/sub subscriber client
export const redisSub = createRedisClient("subscriber");
