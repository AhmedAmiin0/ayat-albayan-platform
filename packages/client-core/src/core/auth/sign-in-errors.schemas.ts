import { z } from 'zod';

/** The API codes of a refused sign-in that the familyAuth.errors texts cover. */
export const SIGN_IN_ERRORS = [
  'invalid_code',
  'invalid_credentials',
  'phone_belongs_to_staff',
  'too_many_requests',
  'codes_unavailable',
] as const;

/** Every code a sign-in screen translates: the refusals plus the password length rules. */
export const signInErrorSchema = z.enum([
  ...SIGN_IN_ERRORS,
  'password_too_short',
  'password_too_long',
  'password_blank',
]);
export type SignInError = z.infer<typeof signInErrorSchema>;
