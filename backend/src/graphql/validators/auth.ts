/**
 * Auth Validators (Zod Schemas)
 *
 * Runtime validation for unified authentication inputs.
 * Validates and normalizes data before it reaches the service layer.
 */
import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v: string) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform((v: string) => v.trim()),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform((v: string) => v.trim()),
  phone: z.string().optional(),
  congregation: z.string().optional(),
  congregationId: z.string().min(1, 'Congregation is required'),
  appointmentStatus: z.enum(['PUBLISHER', 'MINISTERIAL_SERVANT', 'ELDER']).optional(),
  isOverseer: z.boolean().optional(),
});

export const loginUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v: string) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v: string) => v.toLowerCase().trim()),
});

export const verifyResetCodeSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v: string) => v.toLowerCase().trim()),
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
