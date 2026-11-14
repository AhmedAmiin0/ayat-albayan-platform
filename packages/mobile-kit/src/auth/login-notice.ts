import { useSyncExternalStore } from 'react';
import { ApiError } from '../lib/http/api';
import { t } from '../lib/i18n/i18n';
import { type Audience, audience } from './audience';

export { isOtherAppRole } from './role-claim';

export type LoginNotice = 'accountDisabled' | 'wrongApp';

/** The API's refusal for a disabled account: 403 with code `account_disabled`. */
export function isAccountDisabled(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  return typeof error.body === 'object' && error.body !== null && Reflect.get(error.body, 'code') === 'account_disabled';
}

/**
 * «wrongApp» in the staff app names every staff role it serves (mobileRoles, owner 2026-10-12); the
 * family app says the inverse (docs/50 §7): staff sign in to the academy's own app.
 */
const WRONG_APP: Record<Audience, () => string> = {
  staff: () => t.mobileRoles.wrongApp,
  family: () => t.familyApp.wrongApp,
};

export function noticeText(notice: LoginNotice): string {
  return notice === 'wrongApp' ? WRONG_APP[audience()]() : t.mobileNav.accountDisabled;
}

// Why the last session ended, shown once at the login screen (the screen mounts after the gate flips).
let current: LoginNotice | null = null;
const listeners = new Set<() => void>();

export function setLoginNotice(next: LoginNotice | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function useLoginNotice(): string | null {
  const notice = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
  );
  return notice ? noticeText(notice) : null;
}
