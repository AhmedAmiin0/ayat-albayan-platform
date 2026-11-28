import {
  accountSetupRoutes,
  signInRoutes,
  type AccountSetup,
  type CodeSession,
  type CodeStatus,
  type ForgotBody,
  type LoginBody,
  type PasswordSession,
  type ResetBody,
} from '@ab/shared';
import { apiErrorCode, callWith, type ApiClient } from '../http';
import { signInErrorSchema, type SignInError } from './sign-in-errors.schemas';

// Family accounts (docs/30 §6): the public sign-in routes as web and mobile call them. Sessions are
// finished by the app's own supabase client (verifyOtp / setSession).

/** The API allows 3 codes per phone per 15 minutes. */
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

/** The public sign-in calls; every answer is parsed with its route's schema (rule 12). */
export function signInApi(client: ApiClient): SignInApi {
  const call = callWith(client);
  const familyCodes: CodeRoutes = {
    request: (phone) => call({ route: signInRoutes.request, body: { phone } }),
    verify: (body) => call({ route: signInRoutes.verify, body }),
  };
  return {
    codeStatus: () => call({ route: signInRoutes.status }),
    requestCode: familyCodes.request,
    verifyCode: familyCodes.verify,
    familyCodes,
    staffCodes: {
      request: (phone) => call({ route: signInRoutes.staffRequest, body: { phone } }),
      verify: (body) => call({ route: signInRoutes.staffVerify, body }),
    },
    setupAccount: (body) => call({ route: accountSetupRoutes.setup, body }),
    login: (body) => call({ route: signInRoutes.login, body }),
    forgot: (body) => call({ route: signInRoutes.forgot, body }),
    reset: (body) => call({ route: signInRoutes.reset, body }),
  };
}

/**
 * An identifier with @ signs in with GoTrue directly, as before; anything else goes through POST
 * /auth/login.
 */
export const isEmailIdentifier = (identifier: string): boolean => identifier.includes('@');

/** The API's `code` of a sign-in failure the screens translate, or null. */
export function signInError(e: unknown): SignInError | null {
  const parsed = signInErrorSchema.safeParse(apiErrorCode(e));
  return parsed.success ? parsed.data : null;
}
