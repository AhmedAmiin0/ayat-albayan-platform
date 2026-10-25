import { useSyncExternalStore } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

export type LoginNotice = 'accountDisabled' | 'wrongApp';

/** Roles that exist but have no screens in this app: guardians and students (sales and assistant have their trees). */
const OTHER_ROLES: readonly unknown[] = ['guardian', 'student'];

/** The API's refusal for a disabled account: 403 with code `account_disabled`. */
export function isAccountDisabled(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  return typeof error.body === 'object' && error.body !== null && Reflect.get(error.body, 'code') === 'account_disabled';
}

/** A real role of someone else's app: the sign-in says so instead of «لم يُفعَّل حسابك». */
export function isOtherAppRole(role: unknown): boolean {
  return OTHER_ROLES.includes(role);
}

export function noticeText(notice: LoginNotice): string {
  // «wrongApp» names every staff role the app now serves (mobileRoles, owner 2026-10-12).
  return notice === 'wrongApp' ? t.mobileRoles.wrongApp : t.mobileNav.accountDisabled;
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
