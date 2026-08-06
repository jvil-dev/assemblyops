/**
 * Token Service
 *
 * Manages refresh token lifecycle: creation, validation, rotation, and revocation.
 * Refresh tokens are stored in the database to enable server-side invalidation.
 *
 * Token Rotation:
 *   Each time a refresh token is used, that token alone is revoked and a new one
 *   is issued. Other devices keep their own tokens.
 *   If a revoked token is used again (token reuse), ALL user tokens are revoked.
 *   This detects token theft and limits damage.
 *
 * Token Lifetime:
 *   - Access token: 15 minutes (stored only on client)
 *   - Refresh token: 7 days (stored in database)
 *
 * Called by: AuthService
 */
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateTokens, TokenPair } from '../utils/jwt.js';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class TokenService {
  constructor(private prisma: PrismaClient) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createRefreshToken(token: string, userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(token),
        expiresAt,
        userId,
      },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashToken(token) },
      data: { revoked: true },
    });
  }

  /**
   * Drop a token outright. Used by logout: a deliberate sign-out is not a theft
   * signal, so the row must not linger and trip reuse detection on a retry.
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: this.hashToken(token) },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async rotateRefreshToken(
    oldToken: string,
    userId: string,
    email?: string,
    isOverseer?: boolean,
    isAppAdmin?: boolean
  ): Promise<TokenPair | null> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashToken(oldToken) },
    });

    if (!storedToken) return null;

    if (storedToken.revoked) {
      await this.revokeAllUserTokens(userId);
      return null;
    }

    if (storedToken.expiresAt < new Date()) return null;

    await this.revokeRefreshToken(oldToken);

    const tokens = generateTokens({ sub: userId, type: 'user', email, isOverseer, isAppAdmin });
    await this.createRefreshToken(tokens.refreshToken, userId);

    return tokens;
  }

  /**
   * Drop rows whose token has expired. Revoked rows stay until then: a spent
   * token is the evidence reuse detection replays against, and its JWT stays
   * verifiable for the full refresh lifetime.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
