/**
 * @file sessions.types.ts
 * @description TypeScript types specific to the sessions module.
 * Defines the shape of data flowing between the router, service,
 * and database layers for session-related operations.
 */

export interface CreateSessionInput {
  userId?: string;
}

export interface CreateSessionResponse {
  id: string;
  endpointId: string;
  expiresAt: string | null;
  createdAt: string;
  url: string;
}

export interface GetSessionResponse {
  id: string;
  endpointId: string;
  userId: string | null;
  name: string | null;
  expiresAt: string | null;
  createdAt: string;
  requestCount: number;
  url: string;
}
