import { z } from 'zod';
import { ApiError } from '../../http/index.js';
import type { AuthExit, AuthExitDeps } from './auth-exit.types.js';

const disabledBody = z.object({ code: z.literal('account_disabled') });

/** The API's refusal for an account an admin disabled while its token was still valid. */
export const isAccountDisabled = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 403 && disabledBody.safeParse(error.body).success;

const isExpired = (error: unknown): boolean => error instanceof ApiError && error.status === 401;

/**
 * Expired or revoked session (401) or a disabled account: sign out. Any other 403 is a permission
 * the role lacks and keeps the session. The screen's parallel reads all fail together, so one
 * sign-out runs at a time.
 */
export function createAuthExit(deps: AuthExitDeps): AuthExit {
  let leaving = false;
  const leave = (): void => {
    leaving = true;
    void deps.signOut().finally(() => (leaving = false)).catch(() => undefined);
  };
  return (error) => {
    const disabled = isAccountDisabled(error);
    if (leaving || !(disabled || isExpired(error))) return;
    if (disabled) deps.onDisabled?.();
    leave();
  };
}
