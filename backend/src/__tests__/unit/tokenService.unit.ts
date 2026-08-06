/**
 * TokenService Unit Tests
 *
 * Tests the full refresh token lifecycle: creation, rotation, revocation, and
 * cleanup. Prisma is mocked via createPrismaMock(). The jwt module is
 * module-mocked so no real JWT signing occurs.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createPrismaMock } from '../unitTestHelpers.js';
import { TokenService } from '../../services/tokenService.js';

// ---------------------------------------------------------------------------
// Module mock — must be hoisted before the dynamic import of jwt below
// ---------------------------------------------------------------------------
vi.mock('../../utils/jwt.js', () => ({
  generateTokens: vi.fn().mockReturnValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
    expiresIn: 900,
  }),
}));

import { generateTokens } from '../../utils/jwt.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a stored RefreshToken record (not revoked, not expired). */
function makeStoredToken(overrides: Partial<{
  id: string;
  token: string;
  userId: string;
  revoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}> = {}) {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days out
  return {
    id: 'token-id-1',
    token: 'hashed-token-value',
    userId: 'user-abc',
    revoked: false,
    expiresAt: future,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TokenService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: TokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    service = new TokenService(prisma);
  });

  // -------------------------------------------------------------------------
  // createRefreshToken
  // -------------------------------------------------------------------------

  describe('createRefreshToken', () => {
    it('calls prisma.refreshToken.create with hashed token and userId', async () => {
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      await service.createRefreshToken('raw-token', 'user-abc');

      expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
      const { data } = vi.mocked(prisma.refreshToken.create).mock.calls[0][0] as {
        data: { token: string; userId: string; expiresAt: Date };
      };
      // Token must be SHA-256 hashed (64 hex chars), not the raw value
      expect(data.token).toMatch(/^[a-f0-9]{64}$/);
      expect(data.token).not.toBe('raw-token');
      expect(data.userId).toBe('user-abc');
    });

    it('stores an expiry ~7 days in the future', async () => {
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      const before = new Date();
      await service.createRefreshToken('raw-token', 'user-abc');
      const after = new Date();

      const { data } = vi.mocked(prisma.refreshToken.create).mock.calls[0][0] as {
        data: { expiresAt: Date };
      };
      const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
      const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
      expect(data.expiresAt.getTime()).toBeGreaterThan(before.getTime() + sixDaysMs);
      expect(data.expiresAt.getTime()).toBeLessThan(after.getTime() + eightDaysMs);
    });

    it('hashes the same raw token consistently', async () => {
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      await service.createRefreshToken('my-token', 'user-abc');
      const call1 = (vi.mocked(prisma.refreshToken.create).mock.calls[0][0] as { data: { token: string } }).data.token;

      vi.clearAllMocks();
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      await service.createRefreshToken('my-token', 'user-abc');
      const call2 = (vi.mocked(prisma.refreshToken.create).mock.calls[0][0] as { data: { token: string } }).data.token;

      expect(call1).toBe(call2);
    });
  });

  // -------------------------------------------------------------------------
  // revokeRefreshToken
  // -------------------------------------------------------------------------

  describe('revokeRefreshToken', () => {
    it('calls updateMany with the hashed token and sets revoked=true', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });

      await service.revokeRefreshToken('raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
      const args = vi.mocked(prisma.refreshToken.updateMany).mock.calls[0][0] as {
        where: { token: string };
        data: { revoked: boolean };
      };
      expect(args.where.token).toMatch(/^[a-f0-9]{64}$/);
      expect(args.data.revoked).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // deleteRefreshToken
  // -------------------------------------------------------------------------

  describe('deleteRefreshToken', () => {
    it('calls deleteMany with the hashed token and does not revoke', async () => {
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 1 });

      await service.deleteRefreshToken('raw-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledOnce();
      const args = vi.mocked(prisma.refreshToken.deleteMany).mock.calls[0][0] as {
        where: { token: string };
      };
      expect(args.where.token).toMatch(/^[a-f0-9]{64}$/);
      expect(args.where.token).not.toBe('raw-token');
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // revokeAllUserTokens
  // -------------------------------------------------------------------------

  describe('revokeAllUserTokens', () => {
    it('calls updateMany filtering by userId and revoked=false', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 });

      await service.revokeAllUserTokens('user-abc');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
      const args = vi.mocked(prisma.refreshToken.updateMany).mock.calls[0][0] as {
        where: { userId: string; revoked: boolean };
        data: { revoked: boolean };
      };
      expect(args.where.userId).toBe('user-abc');
      expect(args.where.revoked).toBe(false);
      expect(args.data.revoked).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // rotateRefreshToken
  // -------------------------------------------------------------------------

  describe('rotateRefreshToken', () => {
    it('looks the token up by hash, not by raw value', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);

      await service.rotateRefreshToken('raw-token-value', 'user-abc');

      const args = vi.mocked(prisma.refreshToken.findUnique).mock.calls[0][0] as {
        where: { token: string };
      };
      expect(args.where.token).toMatch(/^[a-f0-9]{64}$/);
      expect(args.where.token).not.toBe('raw-token-value');
    });

    it('returns null when the token is not found in the DB', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null);

      const result = await service.rotateRefreshToken('old-token', 'user-abc');

      expect(result).toBeNull();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('returns null and revokes all tokens when the token is already revoked (reuse detection)', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        makeStoredToken({ revoked: true })
      );
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });

      const result = await service.rotateRefreshToken('old-token', 'user-abc');

      expect(result).toBeNull();
      // revokeAllUserTokens must be called to limit damage from token theft
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
      const args = vi.mocked(prisma.refreshToken.updateMany).mock.calls[0][0] as {
        where: { userId: string; revoked: boolean };
      };
      expect(args.where.userId).toBe('user-abc');
      expect(args.where.revoked).toBe(false);
      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('returns null when the token is expired (past expiresAt)', async () => {
      const expired = new Date(Date.now() - 1000); // 1 second in the past
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(
        makeStoredToken({ expiresAt: expired })
      );

      const result = await service.rotateRefreshToken('old-token', 'user-abc');

      expect(result).toBeNull();
      expect(generateTokens).not.toHaveBeenCalled();
    });

    it('happy path: revokes only the spent token, generates a new pair, stores it, and returns it', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(makeStoredToken());
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      const result = await service.rotateRefreshToken(
        'old-token',
        'user-abc',
        'test@example.com',
        true,
        false
      );

      expect(result).toEqual({
        accessToken: 'mock-access',
        refreshToken: 'mock-refresh',
        expiresIn: 900,
      });

      // Only the spent token is retired — other devices keep their rows
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
      const revokeArgs = vi.mocked(prisma.refreshToken.updateMany).mock.calls[0][0] as {
        where: { token: string; userId?: string };
        data: { revoked: boolean };
      };
      expect(revokeArgs.where.token).toMatch(/^[a-f0-9]{64}$/);
      expect(revokeArgs.where.userId).toBeUndefined();
      expect(revokeArgs.data.revoked).toBe(true);

      // generateTokens called with correct payload
      expect(generateTokens).toHaveBeenCalledOnce();
      expect(generateTokens).toHaveBeenCalledWith({
        sub: 'user-abc',
        type: 'user',
        email: 'test@example.com',
        isOverseer: true,
        isAppAdmin: false,
      });

      // New refresh token stored in DB
      expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
      const createArgs = vi.mocked(prisma.refreshToken.create).mock.calls[0][0] as {
        data: { token: string; userId: string; expiresAt: Date };
      };
      expect(createArgs.data.userId).toBe('user-abc');
      // The stored token must be the hash of 'mock-refresh', not the raw value
      expect(createArgs.data.token).toMatch(/^[a-f0-9]{64}$/);
      expect(createArgs.data.token).not.toBe('mock-refresh');
    });

    it('happy path: works without optional email/isOverseer/isAppAdmin args', async () => {
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(makeStoredToken());
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.refreshToken.create).mockResolvedValue(makeStoredToken());

      const result = await service.rotateRefreshToken('old-token', 'user-abc');

      expect(result).not.toBeNull();
      expect(generateTokens).toHaveBeenCalledWith({
        sub: 'user-abc',
        type: 'user',
        email: undefined,
        isOverseer: undefined,
        isAppAdmin: undefined,
      });
    });
  });

  // -------------------------------------------------------------------------
  // cleanupExpiredTokens
  // -------------------------------------------------------------------------

  describe('cleanupExpiredTokens', () => {
    it('deletes expired records and returns the deleted count', async () => {
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 5 });

      const count = await service.cleanupExpiredTokens();

      expect(count).toBe(5);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledOnce();
      const args = vi.mocked(prisma.refreshToken.deleteMany).mock.calls[0][0] as {
        where: { expiresAt: { lt: Date }; revoked?: boolean; OR?: unknown[] };
      };
      expect(args.where.expiresAt.lt).toBeInstanceOf(Date);
      // Revoked-but-unexpired rows must survive — they are what reuse detection replays against
      expect(args.where.OR).toBeUndefined();
      expect(args.where.revoked).toBeUndefined();
    });

    it('returns 0 when there is nothing to clean up', async () => {
      vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 0 });

      const count = await service.cleanupExpiredTokens();

      expect(count).toBe(0);
    });
  });
});
