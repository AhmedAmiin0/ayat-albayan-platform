import type { CodeSession, CodeStatus, ForgotBody, LoginBody, PasswordSession, ResetBody } from '@ab/shared';
import { ApiError, type ApiClient } from '../http/index.js';

// Family accounts (docs/30 §6): the public sign-in routes as web and mobile call them. Sessions are
// finished by the app's own supabase client (verifyOtp / setSession).

/** Seconds before «أعد إرسال الرمز» comes back (the API allows 3 codes per phone per 15 minutes). */
export const RESEND_SECONDS = 60;

export interface SignInApi {
  codeStatus(): Promise<CodeStatus>;
  requestCode(phone: string): Promise<void>;
  verifyCode(body: { phone: string; code: string }): Promise<CodeSession>;
  login(body: LoginBody): Promise<PasswordSession>;
  forgot(body: ForgotBody): Promise<void>;
  reset(body: ResetBody): Promise<void>;
}

export function signInApi(client: Pick<ApiClient, 'apiFetch' | 'apiSend'>): SignInApi {
  return {
    codeStatus: () => client.apiFetch<CodeStatus>('/auth/code/status'),
    requestCode: (phone) => client.apiSend('POST', '/auth/code/request', { phone }),
    verifyCode: (body) => client.apiSend<CodeSession>('POST', '/auth/code/verify', body),
    login: (body) => client.apiSend<PasswordSession>('POST', '/auth/login', body),
    forgot: (body) => client.apiSend('POST', '/auth/password/forgot', body),
    reset: (body) => client.apiSend('POST', '/auth/password/reset', body),
  };
}

/** An identifier with @ signs in with GoTrue directly, as before; anything else goes through POST /auth/login. */
export const isEmailIdentifier = (identifier: string): boolean => identifier.includes('@');

/** The familyAuth.errors keys a sign-in failure maps to (anything unknown: null, the caller's generic text). */
export const SIGN_IN_ERRORS = [
  'invalid_code',
  'invalid_credentials',
  'phone_belongs_to_staff',
  'too_many_requests',
  'codes_unavailable',
] as const;
export type SignInError = (typeof SIGN_IN_ERRORS)[number] | 'password_too_short' | 'password_too_long' | 'password_blank';

/** The API's `code` of a sign-in failure, or null. */
export function signInError(e: unknown): SignInError | null {
  if (!(e instanceof ApiError) || typeof e.body !== 'object' || e.body === null || !('code' in e.body)) return null;
  const code = e.body.code;
  if (typeof code !== 'string') return null;
  if ((SIGN_IN_ERRORS as readonly string[]).includes(code)) return code as SignInError;
  return code === 'password_too_short' || code === 'password_too_long' || code === 'password_blank' ? code : null;
}
