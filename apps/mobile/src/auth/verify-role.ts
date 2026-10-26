import type { Session } from '@supabase/supabase-js';
import { ApiError, apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { cacheRestored, queryClient } from '@/core/lib/query/query-client';
import { supabase } from '@/core/lib/http/supabase';
import { isAccountDisabled, isOtherAppRole, setLoginNotice } from './login-notice';
import { appRole, roleClaim, type AppRole } from './role-claim';

export interface Me {
  role: string | null;
}

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
 * revoked session or a role that lost the app signs out (SIGNED_OUT moves the gate), as below.
 */
export function verifyRole(session: Session): Promise<AppRole | 'out'> {
  return Promise.race([checkRole(session), savedRoleLater()]);
}

/**
 * With a session in hand: which app does this person get (R-AUTH-01)? Admins the admin tabs,
 * teachers the teacher tabs, sales and classroom assistants their own; anyone else (a guardian, a student, no role, a dead session) is signed out.
 * Offline or a 5xx falls back to the token's own `user_role` claim, so the cached reads stay
 * usable without a connection (R-MOB-03); the API still checks the role on every call.
 */
async function checkRole(session: Session): Promise<AppRole | 'out'> {
  try {
    const me = await apiFetch<Me>('/auth/me');
    const role = appRole(me.role);
    // Seed the permissions the tab bar reads, so its first render already hides what the role lacks.
    if (role) queryClient.setQueryData(pathKey('/auth/me'), me);
    if (role) return role;
    if (isOtherAppRole(me.role)) setLoginNotice('wrongApp');
  } catch (error) {
    if (isAccountDisabled(error)) setLoginNotice('accountDisabled');
    if (!(error instanceof ApiError) || error.status >= 500) {
      const claimed = roleClaim(session.access_token);
      if (claimed) return claimed;
    }
  }
  await supabase.auth.signOut();
  return 'out';
}
