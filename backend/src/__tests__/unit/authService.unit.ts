/**
 * AuthService Unit Tests
 *
 * Tests the unified auth service in isolation using a mocked PrismaClient.
 * All external dependencies (JWT, password hashing, OAuth verifiers, etc.)
 * are mocked at the module level so tests exercise only service logic.
 *
 * Coverage:
 *   - registerUser: Zod validation, duplicate email guard, congregation lookup, happy path
 *   - loginUser: user not found, OAuth-only account, wrong password, happy path
 *   - loginWithGoogle / loginWithApple: existing connection, email auto-link, new user
 *   - completeOAuthRegistration: invalid token, happy path with transaction
 *   - refreshToken: invalid token returns null, happy path
 *   - logout: revokes token and returns true
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider } from '@prisma/client';
import { AuthService } from '../../services/authService.js';
import { createPrismaMock } from '../unitTestHelpers.js';
import { AuthenticationError, ConflictError, ValidationError } from '../../utils/errors.js';

// ─── Module-level mocks ───────────────────────────────────────────────────────

vi.mock('../../utils/jwt.js', () => ({
  generateTokens: vi.fn().mockReturnValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
    expiresIn: 900,
  }),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('../../utils/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

vi.mock('../../utils/credentials.js', () => ({
  generateUserId: vi.fn().mockReturnValue('ABCDEF'),
}));

vi.mock('../../utils/oauthVerifiers.js', () => ({
  verifyGoogleToken: vi.fn(),
  verifyAppleToken: vi.fn(),
}));

vi.mock('../../utils/pendingOAuth.js', () => ({
  generatePendingOAuthToken: vi.fn().mockReturnValue('pending-token-123'),
  verifyPendingOAuthToken: vi.fn(),
}));

vi.mock('../../utils/encryption.js', () => ({
  encryptField: vi.fn().mockReturnValue('encrypted-value'),
}));

// ─── Import mocked utilities after vi.mock calls ──────────────────────────────

import { generateTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { generateUserId } from '../../utils/credentials.js';
import { verifyGoogleToken, verifyAppleToken } from '../../utils/oauthVerifiers.js';
import { generatePendingOAuthToken, verifyPendingOAuthToken } from '../../utils/pendingOAuth.js';
import { encryptField } from '../../utils/encryption.js';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW = new Date();

const mockUser = {
  id: 'user-1',
  userId: 'ABCDEF',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: null,
  congregation: null,
  congregationId: null,
  appointmentStatus: null,
  isOverseer: false,
  isAppAdmin: false,
  passwordHash: 'hashed-password',
  createdAt: NOW,
  updatedAt: NOW,
};

const mockTokenPair = {
  accessToken: 'mock-access',
  refreshToken: 'mock-refresh',
  expiresIn: 900,
};

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createPrismaMock();
    service = new AuthService(prisma);

    // TokenService internals — delete all tokens + create refresh token are called on every
    // successful auth path. Default these to resolved so tests don't need to repeat them.
    vi.mocked(prisma.refreshToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
  });

  // ─────────────────────────────────────────────
  // registerUser
  // ─────────────────────────────────────────────

  describe('registerUser', () => {
    it('throws ValidationError when password is too short', async () => {
      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'Short1',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'cong-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when password has no uppercase letter', async () => {
      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'alllowercase1',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'cong-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when password has no number', async () => {
      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'NoNumbersHere',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'cong-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when email is invalid', async () => {
      await expect(
        service.registerUser({
          email: 'not-an-email',
          password: 'Valid1Pass',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'cong-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError when email already exists', async () => {
      // findUnique for email → existing user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as never);

      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'Valid1Pass',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'cong-1',
        })
      ).rejects.toThrow(ConflictError);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('throws ValidationError when congregationId is missing', async () => {
      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'ValidPass123',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('registers a new user with a valid congregationId lookup', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null as never) // email check
        .mockResolvedValueOnce(null as never); // userId uniqueness loop

      vi.mocked(prisma.congregation.findUnique).mockResolvedValue({
        name: 'Riverside Congregation',
      } as never);

      const userWithCongregation = {
        ...mockUser,
        congregation: 'Riverside Congregation',
        congregationId: 'cong-1',
      };
      vi.mocked(prisma.user.create).mockResolvedValue(userWithCongregation as never);

      const result = await service.registerUser({
        email: 'test@example.com',
        password: 'Valid1Pass',
        firstName: 'John',
        lastName: 'Doe',
        congregationId: 'cong-1',
      });

      expect(prisma.congregation.findUnique).toHaveBeenCalledWith({
        where: { id: 'cong-1' },
        select: { name: true },
      });
      expect(result.user?.congregation).toBe('Riverside Congregation');
      expect(result.user?.congregationId).toBe('cong-1');

      expect(hashPassword).toHaveBeenCalledWith('Valid1Pass');
    });

    it('throws ValidationError when congregationId is not found', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce(null as never);

      vi.mocked(prisma.congregation.findUnique).mockResolvedValue(null as never);

      await expect(
        service.registerUser({
          email: 'test@example.com',
          password: 'Password123',
          firstName: 'John',
          lastName: 'Williams',
          congregationId: 'nonexistent',
        })
      ).rejects.toThrow(ValidationError);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('calls generateUserId and uses it when creating user', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce(null as never);

      vi.mocked(prisma.congregation.findUnique).mockResolvedValue({
        name: 'North South West',
      } as never);

      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);

      await service.registerUser({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Williams',
        congregationId: 'cong-1',
      });

      expect(generateUserId).toHaveBeenCalled();
      const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
      expect(createCall.data.userId).toBe('ABCDEF');
    });
  });

  // ─────────────────────────────────────────────
  // loginUser
  // ─────────────────────────────────────────────

  describe('loginUser', () => {
    it('throws AuthenticationError when user is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      await expect(
        service.loginUser({ email: 'unknown@example.com', password: 'Valid1Pass' })
      ).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when user has no passwordHash (OAuth-only account)', async () => {
      const oauthOnlyUser = { ...mockUser, passwordHash: null };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(oauthOnlyUser as never);

      await expect(
        service.loginUser({ email: 'test@example.com', password: 'Valid1Pass' })
      ).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when password is wrong', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(
        service.loginUser({ email: 'test@example.com', password: 'WrongPass1' })
      ).rejects.toThrow(AuthenticationError);
    });

    it('returns user and tokens on successful login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const result = await service.loginUser({
        email: 'test@example.com',
        password: 'Valid1Pass',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokenPair);
      expect(verifyPassword).toHaveBeenCalledWith('Valid1Pass', 'hashed-password');
      expect(generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'user' })
      );
    });

    it('throws ValidationError when email is missing', async () => {
      await expect(service.loginUser({ email: '', password: 'Valid1Pass' })).rejects.toThrow(
        ValidationError
      );
    });
  });

  // ─────────────────────────────────────────────
  // loginWithGoogle
  // ─────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    const googleUserInfo = {
      providerId: 'google-provider-id-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('returns existing user when OAuth connection already exists', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(googleUserInfo);

      // Found existing OAuthConnection with linked user
      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue({
        provider: AuthProvider.GOOGLE,
        providerId: 'google-provider-id-123',
        user: mockUser,
      } as never);

      const result = await service.loginWithGoogle('google-id-token');

      expect(result.isNewUser).toBe(false);
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokenPair);
      expect(prisma.oAuthConnection.create).not.toHaveBeenCalled();
    });

    it('auto-links existing email account when no OAuth connection found', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(googleUserInfo);

      // No OAuthConnection exists
      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      // But email matches existing user
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
      vi.mocked(prisma.oAuthConnection.create).mockResolvedValue({} as never);

      const result = await service.loginWithGoogle('google-id-token');

      expect(result.isNewUser).toBe(false);
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokenPair);
      expect(prisma.oAuthConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: AuthProvider.GOOGLE,
            providerId: 'google-provider-id-123',
            encryptedEmail: 'encrypted-value',
            userId: 'user-1',
          }),
        })
      );
      expect(encryptField).toHaveBeenCalledWith('test@example.com');
    });

    it('returns pendingOAuthToken for completely new users', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(googleUserInfo);
      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await service.loginWithGoogle('google-id-token');

      expect(result.isNewUser).toBe(true);
      expect(result.user).toBeNull();
      expect(result.tokens).toBeNull();
      expect(result.pendingOAuthToken).toBe('pending-token-123');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(generatePendingOAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProvider.GOOGLE,
          providerId: 'google-provider-id-123',
          email: 'test@example.com',
        })
      );
    });
  });

  // ─────────────────────────────────────────────
  // loginWithApple
  // ─────────────────────────────────────────────

  describe('loginWithApple', () => {
    const appleUserInfo = {
      providerId: 'apple-provider-id-456',
      email: 'apple@example.com',
      firstName: undefined as string | undefined,
      lastName: undefined as string | undefined,
    };

    it('returns existing user when Apple OAuth connection exists', async () => {
      vi.mocked(verifyAppleToken).mockResolvedValue({ ...appleUserInfo });

      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue({
        provider: AuthProvider.APPLE,
        providerId: 'apple-provider-id-456',
        user: { ...mockUser, email: 'apple@example.com' },
      } as never);

      const result = await service.loginWithApple('apple-identity-token');

      expect(result.isNewUser).toBe(false);
      expect(result.tokens).toEqual(mockTokenPair);
    });

    it('auto-links existing email account when no Apple connection found', async () => {
      vi.mocked(verifyAppleToken).mockResolvedValue({ ...appleUserInfo });

      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        email: 'apple@example.com',
      } as never);
      vi.mocked(prisma.oAuthConnection.create).mockResolvedValue({} as never);

      const result = await service.loginWithApple('apple-identity-token');

      expect(result.isNewUser).toBe(false);
      expect(result.user?.email).toBe('apple@example.com');
      expect(prisma.oAuthConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: AuthProvider.APPLE,
          }),
        })
      );
    });

    it('returns pendingOAuthToken for new Apple users', async () => {
      vi.mocked(verifyAppleToken).mockResolvedValue({ ...appleUserInfo });

      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await service.loginWithApple('apple-identity-token');

      expect(result.isNewUser).toBe(true);
      expect(result.pendingOAuthToken).toBe('pending-token-123');
    });

    it('overrides firstName and lastName from Apple arguments when provided', async () => {
      // Apple only sends name on first sign-in; subsequent logins omit it
      const appleInfoWithoutName = {
        providerId: 'apple-provider-id-456',
        email: 'apple@example.com',
        firstName: undefined as string | undefined,
        lastName: undefined as string | undefined,
      };
      vi.mocked(verifyAppleToken).mockResolvedValue(appleInfoWithoutName);

      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      const result = await service.loginWithApple(
        'apple-identity-token',
        'FirstFromApple',
        'LastFromApple'
      );

      expect(result.firstName).toBe('FirstFromApple');
      expect(result.lastName).toBe('LastFromApple');
    });

    it('does not override firstName/lastName when args are undefined', async () => {
      const appleInfoWithName = {
        providerId: 'apple-provider-id-456',
        email: 'apple@example.com',
        firstName: 'TokenFirst',
        lastName: 'TokenLast',
      };
      vi.mocked(verifyAppleToken).mockResolvedValue(appleInfoWithName);

      vi.mocked(prisma.oAuthConnection.findUnique).mockResolvedValue(null as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

      // No firstName/lastName args → token values are preserved
      const result = await service.loginWithApple('apple-identity-token');

      expect(result.firstName).toBe('TokenFirst');
      expect(result.lastName).toBe('TokenLast');
    });
  });

  // ─────────────────────────────────────────────
  // completeOAuthRegistration
  // ─────────────────────────────────────────────

  describe('completeOAuthRegistration', () => {
    it('throws AuthenticationError when pendingOAuthToken is invalid', async () => {
      vi.mocked(verifyPendingOAuthToken).mockReturnValue(null);

      await expect(
        service.completeOAuthRegistration({
          pendingOAuthToken: 'bad-token',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('creates user and OAuthConnection in a transaction on valid pending token', async () => {
      const pendingPayload = {
        provider: AuthProvider.GOOGLE,
        providerId: 'google-provider-id-123',
        email: 'newuser@example.com',
      };
      vi.mocked(verifyPendingOAuthToken).mockReturnValue(pendingPayload as never);

      // userId uniqueness check → null (no collision)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

      const newUser = {
        ...mockUser,
        id: 'user-2',
        email: 'newuser@example.com',
        passwordHash: null,
      };

      // $transaction passes the prisma mock as tx; create calls hit the same spies
      vi.mocked(prisma.user.create).mockResolvedValue(newUser as never);
      vi.mocked(prisma.oAuthConnection.create).mockResolvedValue({} as never);

      const result = await service.completeOAuthRegistration({
        pendingOAuthToken: 'pending-token-123',
        firstName: 'John',
        lastName: 'Doe',
        isOverseer: false,
      });

      expect(result.user).toEqual(newUser);
      expect(result.tokens).toEqual(mockTokenPair);

      // User created with correct data
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            isOverseer: false,
            passwordHash: null,
          }),
        })
      );

      // OAuthConnection created with encrypted email
      expect(prisma.oAuthConnection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: AuthProvider.GOOGLE,
            providerId: 'google-provider-id-123',
            encryptedEmail: 'encrypted-value',
          }),
        })
      );
    });

    it('sets isOverseer flag correctly when provided', async () => {
      const pendingPayload = {
        provider: AuthProvider.APPLE,
        providerId: 'apple-id',
        email: 'overseer@example.com',
      };
      vi.mocked(verifyPendingOAuthToken).mockReturnValue(pendingPayload as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null as never);

      const overseerUser = { ...mockUser, isOverseer: true, email: 'overseer@example.com' };
      vi.mocked(prisma.user.create).mockResolvedValue(overseerUser as never);
      vi.mocked(prisma.oAuthConnection.create).mockResolvedValue({} as never);

      await service.completeOAuthRegistration({
        pendingOAuthToken: 'pending-token-123',
        firstName: 'Jane',
        lastName: 'Smith',
        isOverseer: true,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isOverseer: true }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────
  // refreshToken
  // ─────────────────────────────────────────────

  describe('refreshToken', () => {
    it('returns null when validateRefreshToken fails (invalid/expired token)', async () => {
      // verifyRefreshToken throws → validateRefreshToken catches and returns null
      vi.mocked(verifyRefreshToken).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const result = await service.refreshToken('bad-refresh-token');

      expect(result).toBeNull();
    });

    it('returns new TokenPair on valid refresh token', async () => {
      // verifyRefreshToken succeeds
      vi.mocked(verifyRefreshToken).mockReturnValue({
        sub: 'user-1',
        type: 'user',
        iat: 0,
        exp: 9999999999,
      } as never);

      // Stored token is valid and not revoked
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        token: 'hashed-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: 'user-1',
      } as never);

      // User lookup for email/isOverseer/isAppAdmin fields
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: 'test@example.com',
        isOverseer: false,
        isAppAdmin: false,
      } as never);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual(mockTokenPair);
      expect(generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'user' })
      );
    });
  });

  // ─────────────────────────────────────────────
  // logout
  // ─────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the refresh token and returns true', async () => {
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as never);

      const result = await service.logout('some-refresh-token');

      expect(result).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revoked: true },
        })
      );
    });
  });
});
