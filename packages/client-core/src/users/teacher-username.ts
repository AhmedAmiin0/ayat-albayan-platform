import { username as usernameSchema } from '@ab/shared';
import { ApiError } from '../http/index.js';

// A teacher's «اسم المستخدم» in the admin teacher form, web and mobile (docs/30 §1, §7).

/** The app's `t.familyAuth.teacherUsername`. */
export interface TeacherUsernameText {
  invalid: string;
  taken: string;
  needsLogin: string;
}

/** What the PATCH carries: nothing (unchanged), a username, or null (cleared); or the invalid text. */
export type UsernameChange = { ok: true; body: { username?: string | null } } | { ok: false; error: string };

/** The typed value as it is kept: trimmed, lower-case (on blur and on submit). */
export const tidyUsername = (typed: string): string => typed.trim().toLowerCase();

/** Compares the typed username with the saved one; empty clears it, anything else must be valid. */
export function usernameChange(saved: string | null | undefined, typed: string, text: TeacherUsernameText): UsernameChange {
  const next = tidyUsername(typed);
  if (next === (saved ?? '')) return { ok: true, body: {} };
  if (next === '') return { ok: true, body: { username: null } };
  const parsed = usernameSchema.safeParse(next);
  return parsed.success ? { ok: true, body: { username: parsed.data } } : { ok: false, error: text.invalid };
}

/** 409 username_taken / username_needs_login → the app's words; null for any other error. */
export function usernameApiError(error: unknown, text: TeacherUsernameText): string | null {
  if (!(error instanceof ApiError) || error.status !== 409 || typeof error.body !== 'object' || error.body === null) return null;
  const code: unknown = Reflect.get(error.body, 'code');
  if (code === 'username_taken') return text.taken;
  if (code === 'username_needs_login') return text.needsLogin;
  return null;
}
