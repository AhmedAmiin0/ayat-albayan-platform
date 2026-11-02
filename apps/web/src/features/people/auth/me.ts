import { pathKey, setViewerPersonTz } from '@ab/client-core';
import type { Permission, UserRole } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { apiFetch } from '@/lib/http/api';
import { forgetWebPush } from '@/features/messaging/notifications/web-push/web-push';
import { supabase } from '@/lib/http/supabase';

export interface Me {
  id: string;
  email: string | null;
  role: UserRole | null;
  /** Effective permissions of the held role (dynamic roles); the API enforces the same set. */
  permissions: Permission[];
  /** The person's own IANA zone (docs/34 §2); null → this browser's zone. */
  tz?: string | null;
}

/** 403 account_disabled: the profile was disabled while the token was still valid (checked structurally, no import of ApiError). */
export function isAccountDisabled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error) || error.status !== 403 || !('body' in error)) return false;
  const { body } = error;
  return typeof body === 'object' && body !== null && 'code' in body && body.code === 'account_disabled';
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
 */
export async function requireRole(queryClient: QueryClient, role: UserRole | readonly UserRole[]): Promise<Me> {
  const me = await queryClient.ensureQueryData(meQuery).catch((error: unknown) => {
    if (isAccountDisabled(error)) throw redirect({ to: '/login' });
    throw error;
  });
  const allowed: readonly UserRole[] = typeof role === 'string' ? [role] : role;
  if (!me?.role || !allowed.includes(me.role)) throw redirect({ to: '/login' });
  return me;
}

/** Does this user hold `permission`? Signed out holds nothing. */
export function canDo(me: Me | null | undefined, permission: Permission): boolean {
  return me?.permissions.includes(permission) ?? false;
}
