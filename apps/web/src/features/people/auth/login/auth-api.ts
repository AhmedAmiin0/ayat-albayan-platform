import { signInApi, signInError } from '@ab/client-core';
import * as http from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { isAccountDisabled } from '../me';

/**
 * The public sign-in routes (docs/30 §6) on the web's API client. The client's functions are read at
 * call time, so a module that imports sign-in without calling these routes never touches them.
 */
export const authApi = signInApi({
  get apiFetch() {
    return http.apiFetch;
  },
  get apiSend() {
    return http.apiSend;
  },
});

/**
 * The text of a failed sign-in step: the API's `code` (familyAuth.errors, the users' password rules),
 * a disabled account as everywhere else, anything unknown the generic error.
 */
export function signInErrorText(e: unknown): string {
  if (isAccountDisabled(e)) return t.users.errors.account_disabled;
  const key = signInError(e);
  if (key === null) return t.common.error;
  if (key === 'password_too_short' || key === 'password_too_long' || key === 'password_blank') return t.users.errors[key];
  return t.familyAuth.errors[key];
}
