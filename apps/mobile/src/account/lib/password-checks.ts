import { DEFAULT_PASSWORD_MIN, passwordProblem } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { AccountFieldErrors } from './account-errors';

export interface PasswordDraft {
  current: string;
  next: string;
  confirm: string;
}

/**
 * The checks before PUT /me/password (R-ACC-04): the current password typed, the new one long
 * enough (the API's minimum still decides), and the confirmation equal to it. Empty when sendable.
 */
export function passwordChecks({ current, next, confirm }: PasswordDraft, min = DEFAULT_PASSWORD_MIN): AccountFieldErrors {
  const e = t.account.errors;
  const found: AccountFieldErrors = {};
  if (current === '') found.current_password = e.password_required;
  const problem = passwordProblem(next, min);
  if (problem === 'blank') found.new_password = t.account.mobile.newRequired;
  else if (problem === 'too_short') found.new_password = e.password_too_short;
  else if (problem === 'too_long') found.new_password = e.password_too_long;
  if (!found.new_password && current !== '' && next === current) found.new_password = e.password_same;
  if (confirm !== next) found.confirm = t.account.password.mismatch;
  return found;
}
