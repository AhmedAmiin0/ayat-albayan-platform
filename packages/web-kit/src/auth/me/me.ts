import { isAccountDisabled, meLocaleOf, pathKey, setViewerPersonTz } from '@ab/client-core';
import type { Permission, UserRole } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { apiFetch } from '@ab/web-kit/lib/http/api';
import { forgetWebPush } from '@ab/web-kit/push/web-push';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { followProfileLocale } from '@ab/web-kit/lib/i18n/profile-locale';
import { returnSearchOf } from '@ab/web-kit/auth/return-to';

export interface Me {
  id: string;
  email: string | null;
  role: UserRole | null;
  /** Effective permissions of the held role (dynamic roles); the API enforces the same set. */
  permissions: Permission[];
  /** The person's own IANA zone (docs/34 §2); null → this browser's zone. */
  tz?: string | null;
  /** The login's UI language (profiles.locale); read through meLocaleOf (zod). */
  locale?: string | null;
  /** A test account (docs/56): the «تجريبي» chip; absent from an older API = real. */
  is_test?: boolean;
}

function signedOut(): null {
  setViewerPersonTz(null);
  return null;
}

/**
 * Current user as seen by the API (verified JWT), or null when signed out. A disabled account is
 * signed out here, then the error goes on (sign-in shows the message, requireRole redirects).
 */
export const meQuery = queryOptions({
  queryKey: pathKey('/auth/me'),
  queryFn: async (): Promise<Me | null> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return signedOut();
    try {
      const me = await apiFetch<Me>('/auth/me');
      setViewerPersonTz(me.tz); // every time on screen now reads in the person's zone
      followProfileLocale(meLocaleOf(me)); // the login's language: a reload when it differs
      return { ...me, permissions: me.permissions ?? [] };
    } catch (error) {
      if (isAccountDisabled(error)) {
        await forgetWebPush();
        await supabase.auth.signOut();
      }
      throw error;
    }
  },
  staleTime: 60_000,
});

/**
 * Route guard for beforeLoad: signed in and holding `role` (or any of several), else back to
 * /login. The role is the BASE SCOPE (which app, which home); pages inside are gated by permission.
 * `back` (the page asked for, path + search): a signed-out user carries it to /login as
 * `?redirect=` and lands there after sign-in (owner 2026-11-14); a guard without it is unchanged.
 */
export async function requireRole(
  queryClient: QueryClient,
  role: UserRole | readonly UserRole[],
  back?: string,
): Promise<Me> {
  const me = await queryClient.ensureQueryData(meQuery).catch((error: unknown) => {
    if (isAccountDisabled(error)) throw redirect({ to: '/login' });
    throw error;
  });
  const allowed: readonly UserRole[] = typeof role === 'string' ? [role] : role;
  const search = me ? {} : returnSearchOf(back);
  if (!me?.role || !allowed.includes(me.role)) throw redirect({ to: '/login', search });
  return me;
}

/** Does this user hold `permission`? Signed out holds nothing. */
export function canDo(me: Me | null | undefined, permission: Permission): boolean {
  return me?.permissions.includes(permission) ?? false;
}
