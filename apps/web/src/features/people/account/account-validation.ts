import { ACCOUNT_NAME_MAX, ACCOUNT_NAME_MIN, DEFAULT_PASSWORD_MIN, normalizePhone, passwordProblem } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { AccountErrors } from './errors';

// Client checks of the «حسابي» forms, before any request (the API checks the same again).

const E = t.account.errors;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const required = (password: string): AccountErrors => (password === '' ? { current_password: E.password_required } : {});

/** R-ACC-02: the full name, 2 to 80 characters once trimmed. */
export function nameErrors(name: string): AccountErrors {
  const n = name.trim().length;
  if (n < ACCOUNT_NAME_MIN) return { full_name: E.name_too_short };
  return n > ACCOUNT_NAME_MAX ? { full_name: E.name_too_long } : {};
}

/** The number to send: E.164, null when blank (removes it), undefined when it does not parse. */
export function phoneValue(phone: string): string | null | undefined {
  if (phone.trim() === '') return null;
  const r = normalizePhone(phone);
  return r.ok ? r.e164 : undefined;
}

/** R-ACC-02: a valid number (or blank to remove it) and the current password. */
export function phoneErrors(input: { phone: string; password: string }): AccountErrors {
  const out = required(input.password);
  return phoneValue(input.phone) === undefined ? { phone_e164: E.invalid_phone, ...out } : out;
}

/** R-ACC-03: a well-formed email and the current password. */
export function emailErrors(input: { email: string; password: string }): AccountErrors {
  const email = input.email.trim();
  const out = required(input.password);
  return EMAIL.test(email) && email.length <= 254 ? out : { email: E.invalid_email, ...out };
}

export interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

function newPasswordError(f: PasswordForm, min: number): string | undefined {
  const problem = passwordProblem(f.next, min);
  if (problem === 'blank') return t.account.web.newPasswordRequired;
  if (problem === 'too_short') return E.password_too_short;
  if (problem === 'too_long') return E.password_too_long;
  return f.next === f.current ? E.password_same : undefined;
}

/** R-ACC-04: current password, a new one of at least `min` characters, typed twice the same. */
export function passwordErrors(f: PasswordForm, min: number = DEFAULT_PASSWORD_MIN): AccountErrors {
  const out = required(f.current);
  const next = newPasswordError(f, min);
  if (next) out.new_password = next;
  if (f.confirm !== f.next) out.confirm = t.account.password.mismatch;
  return out;
}
