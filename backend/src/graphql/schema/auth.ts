/**
 * GraphQL Auth Schema
 *
 * Unified auth for all users (overseers and volunteers).
 * All users register/login through the same flow.
 * isOverseer flag controls access to overseer features.
 *
 * Implemented by: ../resolvers/auth.ts
 */
const authTypeDefs = `#graphql
  type UserAuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type TokenPayload {
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type LogoutPayload {
    success: Boolean!
  }

  input RegisterUserInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
    congregation: String
    congregationId: ID!
    appointmentStatus: AppointmentStatus
    isOverseer: Boolean
  }

  input LoginUserInput {
    email: String!
    password: String!
  }

  input RefreshTokenInput {
    refreshToken: String!
  }

  input UpdateUserProfileInput {
    firstName: String
    lastName: String
    phone: String
    congregation: String
    congregationId: ID
  }

  input RequestPasswordResetInput {
    email: String!
  }

  input VerifyResetCodeInput {
    email: String!
    code: String!
  }

  input ResetPasswordInput {
    resetToken: String!
    newPassword: String!
  }

  type RequestPasswordResetPayload {
    success: Boolean!
  }

  type VerifyResetCodePayload {
    resetToken: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    registerUser(input: RegisterUserInput!): UserAuthPayload!
    loginUser(input: LoginUserInput!): UserAuthPayload!
    refreshToken(input: RefreshTokenInput!): TokenPayload!
    logoutUser(refreshToken: String!): LogoutPayload!
    logoutAllSessions: LogoutPayload!
    updateUserProfile(input: UpdateUserProfileInput!): User!
    setOverseerMode(isOverseer: Boolean!): User!
    deleteAccount(password: String): Boolean!
    requestPasswordReset(input: RequestPasswordResetInput!): RequestPasswordResetPayload!
    verifyResetCode(input: VerifyResetCodeInput!): VerifyResetCodePayload!
    resetPassword(input: ResetPasswordInput!): UserAuthPayload!
  }
`;

export default authTypeDefs;
