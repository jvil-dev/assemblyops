import { PrismaClient, AuthProvider } from '@prisma/client';
import { TokenService } from './tokenService.js';
import { generateTokens } from '../utils/jwt.js';
import { AuthenticationError } from '../utils/errors.js';
import { verifyGoogleToken, verifyAppleToken } from '../utils/oauthVerifiers.js';
import { generatePendingOAuthToken, verifyPendingOAuthToken } from '../utils/pendingOAuth.js';
import { encryptField } from '../utils/encryption.js';

export class OAuthService {
  private tokenService: TokenService;

  constructor(private prisma: PrismaClient) {
    this.tokenService = new TokenService(prisma);
  }

  async loginWithGoogle(idToken: string) {
    const userInfo = await verifyGoogleToken(idToken);
    return this.handleOAuthLogin(AuthProvider.GOOGLE, userInfo);
  }

  async loginWithApple(identityToken: string, firstName?: string, lastName?: string) {
    const userInfo = await verifyAppleToken(identityToken);
    if (firstName) userInfo.firstName = firstName;
    if (lastName) userInfo.lastName = lastName;
    return this.handleOAuthLogin(AuthProvider.APPLE, userInfo);
  }

  private async handleOAuthLogin(
    provider: AuthProvider,
    userInfo: { providerId: string; email: string; firstName?: string; lastName?: string }
  ) {
    const connection = await this.prisma.oAuthConnection.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: userInfo.providerId,
        },
      },
      include: { user: true },
    });

    if (connection) {
      // Existing user
      const tokens = await this.issueTokens(connection.user);
      return { user: connection.user, tokens, isNewUser: false, email: userInfo.email };
    }

    // Check if email matches existing user
    const existingUser = await this.prisma.user.findUnique({ where: { email: userInfo.email } });

    if (existingUser) {
      // Autolink OAuth to existing account
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

    // New user - return pending token
    const pendingOAuthToken = generatePendingOAuthToken({
      provider,
      providerId: userInfo.providerId,
      email: userInfo.email,
    });
    return {
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
    congregation?: string;
    congregationId?: string;
  }) {
    const pending = verifyPendingOAuthToken(input.pendingOAuthToken);
    if (!pending) throw new AuthenticationError('Invalid or expired registration token');

    // Resolve congregation name from ID if provided
    let congregationName: string | null = input.congregation ?? null;
    let congregationId: string | null = null;
    if (input.congregationId) {
      const cong = await this.prisma.congregation.findUnique({
        where: { id: input.congregationId },
        select: { name: true },
      });
      if (cong) {
        congregationId = input.congregationId;
        congregationName = cong.name;
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      // Check if a user with this email already exists (e.g. registered via email/password)
      const existingUser = await tx.user.findUnique({ where: { email: pending.email } });

      if (existingUser) {
        // Link OAuth connection to existing account
        await tx.oAuthConnection.create({
          data: {
            provider: pending.provider,
            providerId: pending.providerId,
            encryptedEmail: encryptField(pending.email),
            userId: existingUser.id,
          },
        });
        return existingUser;
      }

      const { generateUserId } = await import('../utils/credentials.js');
      const newUserId = generateUserId();
      const newUser = await tx.user.create({
        data: {
          userId: newUserId,
          email: pending.email,
          passwordHash: null,
          firstName: input.firstName,
          lastName: input.lastName,
          isOverseer: input.isOverseer ?? false,
          congregation: congregationName,
          congregationId,
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

  private async issueTokens(admin: { id: string; email: string }) {
    const tokens = generateTokens({ sub: admin.id, type: 'user', email: admin.email });
    await this.tokenService.createRefreshToken(tokens.refreshToken, admin.id);
    return tokens;
  }
}
