import { HOME_BY_ROLE, type UserRole } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { meQuery } from '@/features/auth/me';
import { reportSession } from '@/features/auth/session-activity';
import { supabase } from '@/lib/http/supabase';
import { passwordError } from '../validation';
import { t } from '@/lib/i18n/i18n';

export type SetPasswordResult = { ok: true; home: string } | { ok: false; error: string };

/** What is wrong with the two typed passwords, or undefined. */
export function setPasswordError(password: string, confirm: string): string | undefined {
  return passwordError(password) ?? (password === confirm ? undefined : t.users.validation.mismatch);
}

/** Does the page's URL carry a usable recovery session (the invite / reset link)? */
export async function hasRecoverySession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

/** Saves the new password on the recovery session, then asks the API where this user lands. */
export async function savePassword(password: string, queryClient: QueryClient): Promise<SetPasswordResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: t.users.setPassword.failed };
  queryClient.removeQueries({ queryKey: meQuery.queryKey });
  const me = await queryClient.fetchQuery(meQuery);
  const role: UserRole | null = me?.role ?? null;
  void reportSession('login');
  return { ok: true, home: role ? HOME_BY_ROLE[role] : '/login' };
}
