import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().optional(),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().optional(),
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      data: null,
    };
  }
  return { valid: true, errors: null, data: result.data };
}
