import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { cacheRestored, queryClient } from '@/core/lib/query/query-client';
import { supabase } from '@/core/lib/http/supabase';
import { isAccountDisabled, isOtherAppRole, setLoginNotice } from './login-notice';
import { appRole, roleClaim, type AppRole } from './role-claim';

/** /auth/me as this gate reads it: a missing or odd role is no role (signed out); the rest is kept. */
export const meSchema = z.looseObject({ role: z.string().nullable().catch(null) });
export type Me = z.infer<typeof meSchema>;

/** With the role the last run saved (/auth/me in the persisted cache), the app opens on it after this
 *  long instead of waiting on a slow network; the saved lists show, the reconnecting bar takes over. */
export const SAVED_ROLE_WAIT_MS = 800;

/** The saved role once the cache is back and SAVED_ROLE_WAIT_MS has passed; never settles without one. */
function savedRoleLater(): Promise<AppRole> {
  return new Promise((resolve) => {
    void cacheRestored.then(() =>
      setTimeout(() => {
        const role = appRole(queryClient.getQueryData<Me>(pathKey('/auth/me'))?.role ?? null);
        if (role) resolve(role);
      }, SAVED_ROLE_WAIT_MS),
    );
  });
}

/**
 * The live answer, or the saved role if the live one is slow. A late live answer still counts: a
 * revoked session or a role that lost the app signs out (SIGNED_OUT moves the gate), as below, and
 * another app role goes to `onLive` (the gate), so a changed role never keeps the saved tree.
 */
export function verifyRole(session: Session, onLive?: (role: AppRole) => void): Promise<AppRole | 'out'> {
  const live = checkRole(session);
  void live.then((role) => (role !== 'out' ? onLive?.(role) : undefined));
  return Promise.race([live, savedRoleLater()]);
}

/** What a live answer does, by whether its role has a tree here: seed the permissions the tab bar
 *  reads (its first render already hides what the role lacks), or tell the login screen why. */
const ROLE_APP = {
  app: (me) => void queryClient.setQueryData(pathKey('/auth/me'), me),
  none: (me) => (isOtherAppRole(me.role) ? setLoginNotice('wrongApp') : undefined),
} satisfies Record<'app' | 'none', (me: Me) => void>;

async function liveRole(): Promise<AppRole | null> {
  const me = meSchema.parse(await apiFetch('/auth/me'));
  const role = appRole(me.role);
  ROLE_APP[role ? 'app' : 'none'](me);
  return role;
}

/** Offline or a 5xx (not an ApiError below 500) may trust the token; a refusal never does. */
const trustsClaim = (error: unknown): boolean => !(error instanceof ApiError) || error.status >= 500;

/** After a failed /auth/me: the token's own claim when the failure allows it, else no role. */
function claimFallback(session: Session, error: unknown): AppRole | null {
  if (isAccountDisabled(error)) setLoginNotice('accountDisabled');
  return trustsClaim(error) ? roleClaim(session.access_token) : null;
}

async function signedOut(): Promise<'out'> {
  await supabase.auth.signOut();
  return 'out';
}

/**
 * With a session in hand: which app does this person get (R-AUTH-01)? Admins the admin tabs,
 * teachers the teacher tabs, sales and classroom assistants their own; anyone else (a guardian, a
 * student, no role, a dead session) is signed out.
 * Offline or a 5xx falls back to the token's own `user_role` claim, so the cached reads stay
 * usable without a connection (R-MOB-03); the API still checks the role on every call.
 */
async function checkRole(session: Session): Promise<AppRole | 'out'> {
  const role = await liveRole().catch((error: unknown) => claimFallback(session, error));
  return role ?? signedOut();
}
