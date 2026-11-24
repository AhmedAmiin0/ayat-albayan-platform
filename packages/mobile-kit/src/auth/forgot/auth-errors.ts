import { signInError } from '@ab/client-core';
import { t } from '../../lib/i18n/i18n';

/** The words for a failed public auth call (docs/30 §6): the API's `code`, else the caller's fallback. */
export function authErrorText(error: unknown, fallback: string): string {
  const code = signInError(error);
  if (code === null) return fallback;
  if (code === 'password_too_short' || code === 'password_too_long' || code === 'password_blank') {
    return t.users.errors[code];
  }
  return t.familyAuth.errors[code];
}

/** Too many tries says so; anything else is the generic wrong-credentials text. */
export function loginErrorText(error: unknown): string {
  return signInError(error) === 'too_many_requests' ? t.familyAuth.errors.too_many_requests : t.auth.invalidCredentials;
}
