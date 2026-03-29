/**
 * @file sessions.schema.ts
 * @description Zod validation schemas for session-related API requests.
 * Each schema maps to a specific route and validates the incoming
 * request body, params, or query before it reaches the service layer.
 */

import { z } from 'zod';

// GET /sessions/:id — validate the session ID param
export const getSessionSchema = {
  params: z.object({
    id: z.string().uuid('Session ID must be a valid UUID'),
  }),
};

// PATCH /sessions/:id/name — validate name update body
export const updateSessionNameSchema = {
  params: z.object({
    id: z.string().uuid('Session ID must be a valid UUID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),
  }),
};

// GET /sessions/:id/requests — validate pagination query params
export const getSessionRequestsSchema = {
  params: z.object({
    id: z.string().uuid('Session ID must be a valid UUID'),
  }),
  query: z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
};
