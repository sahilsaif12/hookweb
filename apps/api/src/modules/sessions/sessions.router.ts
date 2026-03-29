/**
 * @file sessions.router.ts
 * @description Express router for session-related endpoints.
 * Handles creating, fetching, updating, and deleting sessions.
 * Each route validates input with Zod before passing to the service layer.
 *
 * Routes:
 * POST   /sessions              — create a new webhook endpoint session
 * GET    /sessions/:id          — get session details + request count
 * PATCH  /sessions/:id/name     — update session display name
 * DELETE /sessions/:id          — delete session + all its requests
 * GET    /sessions/:id/requests — get paginated requests for a session
 */

import { Router, Request, Response, NextFunction } from "express";
import { sessionsService } from "./sessions.service";
import { validate } from "../../middleware/validate.middleware";
import {
  getSessionSchema,
  updateSessionNameSchema,
  getSessionRequestsSchema,
} from "./sessions.schema";

const router: Router = Router();

// POST /sessions — create a new session
// No auth required — anonymous sessions are allowed
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const session = await sessionsService.create({ userId });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /sessions/:id — get session details
router.get(
  "/:id",
  validate(getSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Cast to string — Zod already validated it's a valid UUID string
      const session = await sessionsService.getById(req.params.id as string);
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /sessions/:id/name — update session name
router.patch(
  "/:id/name",
  validate(updateSessionNameSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await sessionsService.updateName(
        req.params.id as string,
        req.body.name as string,
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /sessions/:id — delete session
router.delete(
  "/:id",
  validate(getSessionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await sessionsService.delete(req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /sessions/:id/requests — paginated requests
router.get(
  "/:id/requests",
  validate(getSessionRequestsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = Number(req.query.limit) || 50;

      const result = await sessionsService.getRequests(
        req.params.id as string,
        cursor,
        limit,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export { router as sessionsRouter };
