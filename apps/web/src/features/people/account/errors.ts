import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

/** The inputs of the «حسابي» forms an API error can point at; `form` is the form-level alert. */
export type AccountField = 'full_name' | 'phone_e164' | 'email' | 'current_password' | 'new_password' | 'confirm' | 'avatar' | 'form';
export type AccountErrors = Partial<Record<AccountField, string>>;

const MESSAGES: Record<string, string | undefined> = t.account.errors;

/** Which input a domain code belongs to (400/409 of /me, docs contract). */
const FIELD_OF: Record<string, AccountField | undefined> = {
  wrong_password: 'current_password',
  password_required: 'current_password',
  password_too_short: 'new_password',
  password_too_long: 'new_password',
  password_same: 'new_password',
  phone_taken: 'phone_e164',
  invalid_phone: 'phone_e164',
  email_taken: 'email',
  invalid_email: 'email',
  avatar_type: 'avatar',
  avatar_too_large: 'avatar',
  avatar_path: 'avatar',
  name_too_short: 'full_name',
  name_too_long: 'full_name',
};

/** The reasons of the shared phone normaliser: all read as «رقم الهاتف غير صحيح». */
const PHONE_REASONS = new Set(['empty', 'not_a_number', 'invalid_length', 'missing_country_code']);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The message of one code (a phone reason reads as invalid_phone); the generic one when unknown. */
export function accountMessage(code: string): string {
  return MESSAGES[PHONE_REASONS.has(code) ? 'invalid_phone' : code] ?? t.account.errors.generic;
}

function issuePath(path: unknown): string {
  if (Array.isArray(path)) return path.map(String).join('.');
  return typeof path === 'string' ? path : '';
}

const FIELD_OF_PATH: Record<string, AccountField | undefined> = {
  full_name: 'full_name',
  phone_e164: 'phone_e164',
  email: 'email',
  current_password: 'current_password',
  new_password: 'new_password',
  mime: 'avatar',
  size: 'avatar',
  path: 'avatar',
};

function fromIssues(issues: unknown[]): AccountErrors {
  const out: AccountErrors = {};
  for (const issue of issues) {
    if (!isRecord(issue) || typeof issue.message !== 'string') continue;
    const code = PHONE_REASONS.has(issue.message) ? 'invalid_phone' : issue.message;
    const path = issuePath(issue.path);
    const field = FIELD_OF[code] ?? FIELD_OF_PATH[path] ?? 'form';
    out[field] ??= accountMessage(code);
  }
  return Object.keys(out).length > 0 ? out : { form: t.account.errors.generic };
}

/**
 * An API error of /me as field-level messages (R-ACC-01..05): a domain `{code}` goes to its input,
 * a 400 validation_failed maps each issue by its code, else by its path; anything else is `form`.
 */
export function accountErrors(error: unknown): AccountErrors {
  const body = error instanceof ApiError && isRecord(error.body) ? error.body : null;
  if (!body) return { form: t.account.errors.generic };
  if (body.message === 'validation_failed' && Array.isArray(body.issues)) return fromIssues(body.issues);
  const code = typeof body.code === 'string' ? body.code : '';
  return { [FIELD_OF[code] ?? 'form']: accountMessage(code) };
}
