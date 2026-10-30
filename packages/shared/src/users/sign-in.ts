import { z } from 'zod';
import { normalizePhone } from '../core/format/index.js';
import { PASSWORD_MAX, normalizeStudentCode } from './validation.js';

// Family accounts (docs/30): the public sign-in / forgot-password bodies and the identifier rules
// shared by the API (authoritative), the web and the mobile app.

/**
 * A teacher's sign-in name: lower-case letters, digits, dot, dash, underscore (migration 771 checks the
 * charset). It starts with a letter and never looks like a student code, so a typed identifier is never
 * ambiguous (parseIdentifier).
 */
export const USERNAME_RE = /^[a-z][a-z0-9._-]{2,29}$/;
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, 'invalid_username')
  .refine((v) => normalizeStudentCode(v) === null, 'invalid_username');

/** The authentication template that carries the code (migration 772): sent directly, never queued. */
export const ACCOUNT_CODE_TEMPLATE = 'account_code';

/** Family logins' auth emails: RFC 2606 `.invalid`, never delivered, never displayed. */
export const FAMILY_EMAIL_DOMAIN = 'family.invalid';
export const isFamilyEmail = (email: string | null | undefined): boolean =>
  !!email && email.toLowerCase().endsWith(`@${FAMILY_EMAIL_DOMAIN}`);

/** The 6-digit code: Arabic-Indic digits and spaces are folded first (a pasted «١٢٣ ٤٥٦» works). */
export const LOGIN_CODE_LENGTH = 6;
const asciiDigits = (s: string) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
const digits = (s: string) => asciiDigits(s).replace(/\s/g, '');
export const loginCode = z.string().transform(digits).pipe(z.string().regex(/^\d{6}$/, 'invalid_code'));

const phone = z.string().trim().min(1).max(40);
const identifier = z.string().trim().min(1).max(254);
const password = z.string().min(1).max(PASSWORD_MAX);

export const codeRequestSchema = z.object({ phone });
export const codeVerifySchema = z.object({ phone, code: loginCode });
export const loginSchema = z.object({ username: identifier, password });
export const forgotSchema = z.object({ identifier });
export const resetSchema = z.object({ identifier, code: loginCode, password: z.string().max(PASSWORD_MAX) });

export type CodeRequest = z.infer<typeof codeRequestSchema>;
export type CodeVerify = z.output<typeof codeVerifySchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type ForgotBody = z.infer<typeof forgotSchema>;
export type ResetBody = z.output<typeof resetSchema>;

/** What a typed identifier names. A typed phone is only ever a lookup key, never a destination. */
export type SignInIdentifier =
  | { kind: 'email'; value: string }
  | { kind: 'student'; value: string }
  | { kind: 'phone'; value: string }
  | { kind: 'username'; value: string };

/** email | student code (AB-1234, any case) | phone (any format) | username; null = none of them. */
export function parseIdentifier(raw: string): SignInIdentifier | null {
  const value = asciiDigits(raw.trim());
  if (value.includes('@')) return { kind: 'email', value: value.toLowerCase() };
  const code = normalizeStudentCode(value.replace(/\s/g, ''));
  if (code) return { kind: 'student', value: code };
  if (/^[+(\d]/.test(value)) {
    const p = normalizePhone(value);
    return p.ok ? { kind: 'phone', value: p.e164 } : null;
  }
  const name = username.safeParse(value);
  return name.success ? { kind: 'username', value: name.data } : null;
}

/** The rate-limit key of a typed identifier: variants (case, spaces, dashes, +) share one bucket. */
export function identifierKey(raw: string): string {
  const parsed = parseIdentifier(raw);
  if (parsed) return `${parsed.kind}:${parsed.value}`;
  return `raw:${raw.trim().toLowerCase().replace(/[\s+\-_.]/g, '')}`;
}

/** GET /auth/code/status: codes can be sent now (flag on, template approved, configured). */
export interface CodeStatus {
  available: boolean;
}

/** POST /auth/code/verify: the client finishes with supabase.auth.verifyOtp({ type, token_hash }). */
export interface CodeSession {
  token_hash: string;
  type: 'magiclink';
}

/** POST /auth/login: the session for supabase.auth.setSession. */
export interface PasswordSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number | null;
}
