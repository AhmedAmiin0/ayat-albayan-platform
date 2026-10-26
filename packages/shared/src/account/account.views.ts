import type { UserRole } from '../permissions/roles.js';

/** The held role as the account page names it (the custom role's names, else the system role's). */
export interface AccountRole {
  base: UserRole | null;
  key: string | null;
  name_ar: string | null;
  name_en: string | null;
}

/** GET /me/profile (R-ACC-01) and the answer of every /me change. Never holds a secret. */
export interface AccountProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  /** A short-lived signed URL of the photo, or null (initials are shown). */
  avatar_url: string | null;
  role: AccountRole;
}

/** The error codes of /me (400 / 409), for the forms' field-level messages. */
export const ACCOUNT_ERRORS = [
  'wrong_password',
  'password_required',
  'password_too_short',
  'password_too_long',
  'password_same',
  'phone_taken',
  'email_taken',
  'invalid_email',
  'avatar_type',
  'avatar_too_large',
  'avatar_path',
  'name_too_short',
  'name_too_long',
] as const;
export type AccountError = (typeof ACCOUNT_ERRORS)[number];

/** Initials for the avatar fallback: the first letter of the first two words (Arabic or Latin). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w !== '');
  return words.slice(0, 2).map((w) => Array.from(w)[0] ?? '').join('');
}
