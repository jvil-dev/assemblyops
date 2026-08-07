/**
 * JWT Token Utilities
 *
 * Handles JSON Web Token generation and verification for authentication.
 * Uses two separate secrets for access and refresh tokens.
 *
 * Token Types:
 *   - Access Token (15 min): Short-lived, used for API authorization
 *   - Refresh Token (7 days): Long-lived, used to get new access tokens
 *
 * Payload Structure:
 *   - sub: User ID
 *   - type: 'user'
 *   - email, isOverseer, isAppAdmin: User metadata
 *   - jti: Random per-token id, refresh tokens only
 *
 * Used by: AuthService, context.ts
 */
import crypto from 'crypto';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  type: 'user';
  email?: string;
  isOverseer?: boolean;
  isAppAdmin?: boolean;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: 'user';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function generateTokens(payload: {
  sub: string;
  type: 'user';
  email?: string;
  isOverseer?: boolean;
  isAppAdmin?: boolean;
}): TokenPair {
  const accessTokenOptions: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };

  // jti keeps every refresh token distinct. Without it two tokens issued to one
  // user in the same second are byte-identical, and RefreshToken.token is unique.
  const refreshTokenOptions: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    jwtid: crypto.randomUUID(),
  };

  const accessToken = jwt.sign(
    { sub: payload.sub, type: payload.type, email: payload.email, isOverseer: payload.isOverseer, isAppAdmin: payload.isAppAdmin },
    JWT_SECRET,
    accessTokenOptions
  );

  const refreshToken = jwt.sign(
    { sub: payload.sub, type: payload.type },
    JWT_REFRESH_SECRET,
    refreshTokenOptions
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload;
  return payload;
}

export function validateJwtSecrets(): void {
  const secrets = [
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
    { name: 'JWT_REFRESH_SECRET', value: process.env.JWT_REFRESH_SECRET },
  ];

  for (const { name, value } of secrets) {
    if (!value) {
      throw new Error(`${name} environment variable is required`);
    }
    if (value.length < 32) {
      throw new Error(`${name} must be at least 32 characters`);
    }
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
