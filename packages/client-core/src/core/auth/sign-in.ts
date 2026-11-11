import {
  codeSessionSchema,
  codeStatusSchema,
  type AccountSetup,
  type CodeSession,
  type CodeStatus,
  type ForgotBody,
  type LoginBody,
  type PasswordSession,
  type ResetBody,
} from '@ab/shared';
import { ApiError, type ApiClient } from '../http/index.js';

// Family accounts (docs/30 §6): the public sign-in routes as web and mobile call them. Sessions are
// finished by the app's own supabase client (verifyOtp / setSession).

/**
 * Seconds before «أعد إرسال الرمز» comes back (the API allows 3 codes per phone per 15 minutes).
 */
export const RESEND_SECONDS = 60;

/** One phone + WhatsApp code pair of routes: the family's or the teacher's (docs/46 A2). */
export interface CodeRoutes {
  request: (phone: string) => Promise<void>;
  verify: (body: { phone: string; code: string }) => Promise<CodeSession>;
}

export interface SignInApi {
  codeStatus(): Promise<CodeStatus>;
  requestCode(phone: string): Promise<void>;
  verifyCode(body: { phone: string; code: string }): Promise<CodeSession>;
  /** requestCode + verifyCode as one pair (PhoneSignIn takes either pair). */
  familyCodes: CodeRoutes;
  /** The teacher's code sign-in (docs/46 A2): the same answers as the family's. */
  staffCodes: CodeRoutes;
  /**
   * PUT /me/setup (signed in): a code-made teacher login gets its email and password (docs/46 A4).
   */
  setupAccount(body: AccountSetup): Promise<void>;
  login(body: LoginBody): Promise<PasswordSession>;
  forgot(body: ForgotBody): Promise<void>;
  reset(body: ResetBody): Promise<void>;
}

/** A verify answer, parsed (rule 12): only the token hash and its type ever leave the API. */
const asSession = (body: unknown): CodeSession => codeSessionSchema.parse(body);

export function signInApi(client: Pick<ApiClient, 'apiFetch' | 'apiSend'>): SignInApi {
  const familyCodes: CodeRoutes = {
    request: (phone) => client.apiSend('POST', '/auth/code/request', { phone }),
    verify: (body) => client.apiSend('POST', '/auth/code/verify', body).then(asSession),
  };
  return {
    codeStatus: () => client.apiFetch('/auth/code/status').then((r) => codeStatusSchema.parse(r)),
    requestCode: familyCodes.request,
    verifyCode: familyCodes.verify,
    familyCodes,
    staffCodes: {
      request: (phone) => client.apiSend('POST', '/auth/staff-code/request', { phone }),
      verify: (body) => client.apiSend('POST', '/auth/staff-code/verify', body).then(asSession),
    },
    setupAccount: (body) => client.apiSend('PUT', '/me/setup', body),
    login: (body) => client.apiSend<PasswordSession>('POST', '/auth/login', body),
    forgot: (body) => client.apiSend('POST', '/auth/password/forgot', body),
    reset: (body) => client.apiSend('POST', '/auth/password/reset', body),
  };
}

/**
 * An identifier with @ signs in with GoTrue directly, as before; anything else goes through POST
 * /auth/login.
 */
export const isEmailIdentifier = (identifier: string): boolean => identifier.includes('@');

/**
 * The familyAuth.errors keys a sign-in failure maps to (anything unknown: null, the caller's
 * generic text).
 */
export const SIGN_IN_ERRORS = [
  'invalid_code',
  'invalid_credentials',
  'phone_belongs_to_staff',
  'too_many_requests',
  'codes_unavailable',
] as const;
export type SignInError =
  (typeof SIGN_IN_ERRORS)[number] | 'password_too_short' | 'password_too_long' | 'password_blank';

/** The API's `code` of a sign-in failure, or null. */
export function signInError(e: unknown): SignInError | null {
  if (
    !(e instanceof ApiError) ||
    typeof e.body !== 'object' ||
    e.body === null ||
    !('code' in e.body)
  )
    return null;
  const code = e.body.code;
  if (typeof code !== 'string') return null;
  if ((SIGN_IN_ERRORS as readonly string[]).includes(code)) return code as SignInError;
  return code === 'password_too_short' || code === 'password_too_long' || code === 'password_blank'
    ? code
    : null;
}
