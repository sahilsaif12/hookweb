export interface User {
  id: string;
  email: string;
  googleId: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  endpointId: string;
  userId: string | null;
  name: string | null;
  expiresAt: string | null;
  createdAt: string;
  requestCount: number;
}

export interface WebhookRequest {
  id: string;
  sessionId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
  sourceIp: string;
  receivedAt: string;
}

export interface WSMessage {
  type: 'request.received' | 'session.expired' | 'ping';
  payload: WebhookRequest | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}
