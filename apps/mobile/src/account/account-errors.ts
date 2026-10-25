import { ACCOUNT_ERRORS, type AccountError } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

/** Where a message shows: under one field, or under the section's button («form»). */
export type AccountField =
  | 'full_name'
  | 'phone_e164'
  | 'email'
  | 'current_password'
  | 'new_password'
  | 'confirm'
  | 'avatar'
  | 'form';
export type AccountFieldErrors = Partial<Record<AccountField, string>>;

const FIELDS: readonly string[] = ['full_name', 'phone_e164', 'email', 'current_password', 'new_password', 'avatar'];
/** phoneE164's reasons: one Arabic sentence for all of them. */
const PHONE_REASONS: readonly string[] = ['empty', 'not_a_number', 'invalid_length', 'missing_country_code'];

/** The field each domain code of /me belongs to (R-ACC-02..05). */
const CODE_FIELD: Record<AccountError, AccountField> = {
  wrong_password: 'current_password',
  password_required: 'current_password',
  password_too_short: 'new_password',
  password_too_long: 'new_password',
  password_same: 'new_password',
  phone_taken: 'phone_e164',
  email_taken: 'email',
  invalid_email: 'email',
  avatar_type: 'avatar',
  avatar_too_large: 'avatar',
  avatar_path: 'avatar',
  name_too_short: 'full_name',
  name_too_long: 'full_name',
};

const isCode = (code: unknown): code is AccountError => ACCOUNT_ERRORS.some((c) => c === code);

/** account.errors[code]; every phone reason reads as invalid_phone; an unknown code, generic. */
export function accountMessage(code: string): string {
  const errors = t.account.errors;
  if (PHONE_REASONS.includes(code)) return errors.invalid_phone;
  return isCode(code) ? errors[code] : errors.generic;
}

interface Issue {
  path?: unknown;
  message?: unknown;
}

function issueField(path: unknown): AccountField {
  const first = Array.isArray(path) ? path[0] : typeof path === 'string' ? path.split('.')[0] : undefined;
  return typeof first === 'string' && FIELDS.includes(first) ? (first as AccountField) : 'form';
}

function fromIssues(issues: Issue[]): AccountFieldErrors {
  const out: AccountFieldErrors = {};
  for (const issue of issues) {
    const field = issueField(issue.path);
    out[field] ??= accountMessage(typeof issue.message === 'string' ? issue.message : '');
  }
  return out;
}

/**
 * A failed /me write as field-level messages: a domain `{code}` under its field, each
 * `validation_failed` issue under the field of its path, anything else (network, 5xx) under `fallback`.
 */
export function accountErrors(error: unknown, fallback: AccountField = 'form'): AccountFieldErrors {
  const body = error instanceof ApiError ? error.body : null;
  if (body && typeof body === 'object') {
    const { code, message, issues } = body as { code?: unknown; message?: unknown; issues?: unknown };
    if (message === 'validation_failed' && Array.isArray(issues) && issues.length > 0) return fromIssues(issues as Issue[]);
    if (isCode(code)) return { [CODE_FIELD[code]]: accountMessage(code) };
  }
  return { [fallback]: fallback === 'avatar' ? t.account.errors.avatar_path : t.account.errors.generic };
}
