/**
 * @file jwt.ts
 * @description Utility functions for signing and verifying JWT tokens.
 * Issues two types of tokens:
 * - Access token (short-lived, 15m) — sent in Authorization header
 * - Refresh token (long-lived, 7d) — stored in httpOnly cookie
 *
 * The access token contains the user ID and email.
 * The refresh token contains only the user ID (minimal payload).
 *
 * Why two tokens?
 * Access tokens are short-lived so if stolen, they expire quickly.
 * Refresh tokens live longer but are stored in httpOnly cookies —
 * inaccessible to JavaScript, protecting against XSS attacks.
 */

import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

// Sign an access token with user ID and email
export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Sign a refresh token with only user ID
export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Verify and decode an access token
// Returns null if expired or invalid — never throws
export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    return null;
  }
};

// Verify and decode a refresh token
// Returns null if expired or invalid — never throws
export const verifyRefreshToken = (
  token: string,
): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }
};
