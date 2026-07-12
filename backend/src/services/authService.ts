/**
 * Auth Service
 *
 * Unified authentication for all users (volunteers and overseers).
 * Replaces the old split Admin/Volunteer auth system.
 *
 * Methods:
 *   - registerUser(input): Create new account, returns user + tokens
 *   - loginUser(input): Authenticate with email/password, returns user + tokens
 *   - loginWithGoogle(idToken): OAuth login/registration via Google
 *   - loginWithApple(identityToken, firstName?, lastName?): OAuth login via Apple
 *   - completeOAuthRegistration(input): Complete OAuth new-user registration
 *   - refreshToken(token): Exchange refresh token for new access token
 *   - logout(token): Invalidate a specific refresh token
 *   - updateProfile(userId, input): Patch user profile fields
 *   - setOverseerMode(userId, isOverseer): Toggle overseer flag
 *
 * JWT Payload:
 *   { sub: user.id, type: 'user', email, isOverseer }
 *
 * Called by: ../graphql/resolvers/auth.ts
 */
import { PrismaClient, AuthProvider } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateTokens, TokenPair } from '../utils/jwt.js';
import { TokenService } from './tokenService.js';
import { AuthenticationError, ConflictError, ValidationError } from '../utils/errors.js';
import { generateUserId } from '../utils/credentials.js';
import { verifyGoogleToken, verifyAppleToken } from '../utils/oauthVerifiers.js';
import { generatePendingOAuthToken, verifyPendingOAuthToken } from '../utils/pendingOAuth.js';
import { encryptField } from '../utils/encryption.js';
import {
  registerUserSchema,
  loginUserSchema,
  requestPasswordResetSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  RegisterUserInput,
  LoginUserInput,
  RequestPasswordResetInput,
  VerifyResetCodeInput,
  ResetPasswordInput,
} from '../graphql/validators/auth.js';
import { generateResetCode, hashResetCode } from '../utils/resetToken.js';
import { sendPasswordResetCode } from './emailService.js';
import jwt from 'jsonwebtoken';

// Shape returned for all user auth operations
export interface UserAuthResult {
  user: {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    congregation: string | null;
    congregationId: string | null;
    appointmentStatus: string | null;
    isOverseer: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  tokens: TokenPair | null;
  isNewUser?: boolean;
  pendingOAuthToken?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export class AuthService {
  private tokenService: TokenService;

  constructor(private prisma: PrismaClient) {
    this.tokenService = new TokenService(prisma);
  }

  // ─────────────────────────────────────────────
  // EMAIL / PASSWORD AUTH
  // ─────────────────────────────────────────────

  async registerUser(input: RegisterUserInput): Promise<UserAuthResult> {
    const result = registerUserSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const validated = result.data;

    // Duplicate email guard
    const existing = await this.prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Ensure userId is globally unique (collision is astronomically unlikely but guard anyway)
    let userId: string;
    let attempts = 0;
    do {
      userId = generateUserId();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique user ID');
    } while (await this.prisma.user.findUnique({ where: { userId } }));

    const passwordHash = await hashPassword(validated.password);

    let congregationName: string | null = validated.congregation ?? null;
    let congregationId: string | null = null;
    if (validated.congregationId) {
      const cong = await this.prisma.congregation.findUnique({
        where: { id: validated.congregationId },
        select: { name: true },
      });
      if (!cong) throw new ValidationError('Congregation not found');
      congregationId = validated.congregationId;
      congregationName = cong.name;
    }

    const user = await this.prisma.user.create({
      data: {
        userId,
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone: validated.phone ?? null,
        congregation: congregationName,
        congregationId,
        appointmentStatus: validated.appointmentStatus ?? null,
        isOverseer: validated.isOverseer ?? false,
      },
    });

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async loginUser(input: LoginUserInput): Promise<UserAuthResult> {
    const result = loginUserSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const validated = result.data;

    const user = await this.prisma.user.findUnique({ where: { email: validated.email } });

    if (!user || !user.passwordHash || user.isPlaceholder) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  // ─────────────────────────────────────────────
  // OAUTH AUTH (Google + Apple)
  // ─────────────────────────────────────────────

  async loginWithGoogle(idToken: string): Promise<UserAuthResult> {
    const userInfo = await verifyGoogleToken(idToken);
    return this.handleOAuthLogin(AuthProvider.GOOGLE, userInfo);
  }

  async loginWithApple(
    identityToken: string,
    firstName?: string,
    lastName?: string
  ): Promise<UserAuthResult> {
    const userInfo = await verifyAppleToken(identityToken);
    if (firstName) userInfo.firstName = firstName;
    if (lastName) userInfo.lastName = lastName;
    return this.handleOAuthLogin(AuthProvider.APPLE, userInfo);
  }

  private async handleOAuthLogin(
    provider: AuthProvider,
    userInfo: { providerId: string; email: string; firstName?: string; lastName?: string }
  ): Promise<UserAuthResult> {
    // Check for existing OAuth connection
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: { provider_providerId: { provider, providerId: userInfo.providerId } },
      include: { user: true },
    });

    if (connection) {
      const tokens = await this.issueTokens(connection.user);
      return { user: connection.user, tokens, isNewUser: false, email: userInfo.email };
    }

    // Check if email matches an existing account → auto-link
    const existingUser = await this.prisma.user.findUnique({ where: { email: userInfo.email } });

    if (existingUser && existingUser.isPlaceholder) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (existingUser) {
      await this.prisma.oAuthConnection.create({
        data: {
          provider,
          providerId: userInfo.providerId,
          encryptedEmail: encryptField(userInfo.email),
          userId: existingUser.id,
        },
      });
      const tokens = await this.issueTokens(existingUser);
      return { user: existingUser, tokens, isNewUser: false, email: userInfo.email };
    }

    // New user — return pending token for profile completion
    const pendingOAuthToken = generatePendingOAuthToken({
      provider,
      providerId: userInfo.providerId,
      email: userInfo.email,
    });

    // Return a partial result — user is null until completeOAuthRegistration
    return {
      user: null,
      tokens: null,
      isNewUser: true,
      pendingOAuthToken,
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
    };
  }

  async completeOAuthRegistration(input: {
    pendingOAuthToken: string;
    firstName: string;
    lastName: string;
    isOverseer?: boolean;
  }): Promise<UserAuthResult> {
    const pending = verifyPendingOAuthToken(input.pendingOAuthToken);
    if (!pending) throw new AuthenticationError('Invalid or expired registration token');

    // Ensure userId uniqueness
    let userId: string;
    let attempts = 0;
    do {
      userId = generateUserId();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique user ID');
    } while (await this.prisma.user.findUnique({ where: { userId } }));

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          userId,
          email: pending.email,
          passwordHash: null,
          firstName: input.firstName,
          lastName: input.lastName,
          isOverseer: input.isOverseer ?? false,
        },
      });
      await tx.oAuthConnection.create({
        data: {
          provider: pending.provider,
          providerId: pending.providerId,
          encryptedEmail: encryptField(pending.email),
          userId: newUser.id,
        },
      });
      return newUser;
    });

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  // ─────────────────────────────────────────────
  // TOKEN MANAGEMENT
  // ─────────────────────────────────────────────

  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    const validation = await this.tokenService.validateRefreshToken(refreshToken);
    if (!validation) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: validation.userId },
      select: { email: true, isOverseer: true, isAppAdmin: true },
    });
    return this.tokenService.rotateRefreshToken(
      refreshToken,
      validation.userId,
      user?.email,
      user?.isOverseer,
      user?.isAppAdmin
    );
  }

  async logout(refreshToken: string): Promise<boolean> {
    await this.tokenService.revokeRefreshToken(refreshToken);
    return true;
  }

  // ─────────────────────────────────────────────
  // PROFILE MANAGEMENT
  // ─────────────────────────────────────────────

  async updateProfile(
    userId: string,
    input: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      congregationId?: string | null;
      congregation?: string | null;
    }
  ) {
    const data: Record<string, unknown> = {};

    if (input.firstName != null) data.firstName = input.firstName;
    if (input.lastName != null) data.lastName = input.lastName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.congregationId != null) {
      const cong = await this.prisma.congregation.findUnique({
        where: { id: input.congregationId },
        select: { name: true },
      });
      if (!cong) throw new ValidationError('Congregation not found');
      data.congregationId = input.congregationId;
      data.congregation = cong.name;
    } else if (input.congregation !== undefined) {
      data.congregation = input.congregation;
    }

    const result = await this.prisma.user.update({ where: { id: userId }, data });
    return result;
  }

  async setOverseerMode(userId: string, isOverseer: boolean) {
    return this.prisma.user.update({ where: { id: userId }, data: { isOverseer } });
  }

  // ─────────────────────────────────────────────
  // PASSWORD RESET
  // ─────────────────────────────────────────────

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
    const result = requestPasswordResetSchema.safeParse(input);
    if (!result.success) return; // Silent — don't leak validation details
    const { email } = result.data;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, passwordHash: true },
    });

    // Silent return if user not found or OAuth-only (no password to reset)
    if (!user || !user.passwordHash) return;

    // Delete any existing unused reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate 6-digit code, hash for storage
    const code = generateResetCode();
    const hashedCode = hashResetCode(code);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.passwordResetToken.create({
      data: {
        token: hashedCode,
        userId: user.id,
        expiresAt,
      },
    });

    await sendPasswordResetCode(email, code, user.firstName);
  }

  async verifyResetCode(input: VerifyResetCodeInput): Promise<string> {
    const result = verifyResetCodeSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const { email, code } = result.data;

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) throw new AuthenticationError('Invalid or expired code');

    const hashedCode = hashResetCode(code);
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: hashedCode,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) throw new AuthenticationError('Invalid or expired code');

    // Issue a short-lived JWT for the reset step (follows pendingOAuth pattern)
    const resetJwt = jwt.sign(
      { sub: user.id, purpose: 'password_reset' },
      process.env.JWT_REFRESH_SECRET!,
      { algorithm: 'HS256', expiresIn: '10m' }
    );

    return resetJwt;
  }

  async resetPassword(input: ResetPasswordInput): Promise<UserAuthResult> {
    const result = resetPasswordSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }
    const { resetToken, newPassword } = result.data;

    // Verify the reset JWT
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_REFRESH_SECRET!, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired reset token');
    }
    if (payload.purpose !== 'password_reset' || !payload.sub) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const userId = payload.sub;
    const passwordHash = await hashPassword(newPassword);

    // Update password + mark token used + revoke all refresh tokens in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Mark all unused reset tokens as used
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Revoke all refresh tokens (force re-login everywhere)
      await tx.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });

      return updatedUser;
    });

    // Issue new tokens (auto-login)
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  // ─────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────

  private async issueTokens(user: {
    id: string;
    email: string;
    isOverseer: boolean;
    isAppAdmin?: boolean;
  }) {
    await this.tokenService.deleteAllUserTokens(user.id);
    const tokens = generateTokens({
      sub: user.id,
      type: 'user',
      email: user.email,
      isOverseer: user.isOverseer,
      isAppAdmin: user.isAppAdmin,
    });
    await this.tokenService.createRefreshToken(tokens.refreshToken, user.id);
    return tokens;
  }
}
