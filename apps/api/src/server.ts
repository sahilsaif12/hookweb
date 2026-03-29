/**
 * @file server.ts
 * @description Main entry point for the HookWeb API server.
 * Bootstraps Express with all middleware, mounts all routers,
 * attaches the WebSocket server to the HTTP server, and starts listening.
 * Also handles graceful shutdown on SIGTERM/SIGINT — closes DB and Redis
 * connections cleanly before exiting.
 */

import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { redis, redisSub } from "./config/redis";
import { loggerMiddleware, logger } from "./middleware/logger.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { sessionsRouter } from "./modules/sessions/sessions.router";

const app: Application = express();
const httpServer = http.createServer(app);

// ── Security middleware ────────────────────────────────────────────────────
// helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet());

// cors allows requests from the frontend dev server and production domain
app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  }),
);

// ── Body parsing ───────────────────────────────────────────────────────────
// Parse incoming JSON bodies — limit 1mb to prevent abuse
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// ── Request logging ────────────────────────────────────────────────────────
app.use(loggerMiddleware);

// ── Health check ───────────────────────────────────────────────────────────
// Used by Docker, load balancers, and uptime monitors
// Checks both DB and Redis connectivity before returning healthy
app.get("/healthz", async (req, res) => {
  try {
    // Ping the database
    await prisma.$queryRaw`SELECT 1`;

    // Ping Redis
    await redis.ping();

    res.json({
      status: "ok",
      db: "connected",
      redis: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Service unavailable",
    });
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────
// TODO: mount routers here as we build them
app.use("/sessions", sessionsRouter);
// app.use('/i', webhooksRouter);
// app.use('/auth', authRouter);

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    code: "NOT_FOUND",
  });
});

// ── Global error handler ───────────────────────────────────────────────────
// Must be last — Express identifies error handlers by 4 arguments
app.use(errorMiddleware);

// ── Start server ───────────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  logger.info(`API server running on http://localhost:${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
// When the process receives SIGTERM (e.g. Docker stop) or SIGINT (Ctrl+C),
// we close all connections cleanly before exiting.
// This prevents data loss and hanging connections.
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);

  // Stop accepting new HTTP connections
  httpServer.close(async () => {
    logger.info("HTTP server closed");

    // Disconnect Prisma from the database
    await prisma.$disconnect();
    logger.info("Database disconnected");

    // Disconnect Redis clients
    redis.disconnect();
    redisSub.disconnect();
    logger.info("Redis disconnected");

    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, httpServer };
