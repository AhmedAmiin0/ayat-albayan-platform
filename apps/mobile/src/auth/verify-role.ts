import type { Session } from '@supabase/supabase-js';
import { ApiError, apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { isAccountDisabled, isOtherAppRole, setLoginNotice } from './login-notice';
import { appRole, roleClaim, type AppRole } from './role-claim';

export interface Me {
  role: string | null;
}

/**
 * With a session in hand: which app does this person get (R-AUTH-01)? Admins the admin tabs,
 * teachers the teacher tabs; anyone else (a guardian, no role, a dead session) is signed out.
 * Offline or a 5xx falls back to the token's own `user_role` claim, so the cached reads stay
 * usable without a connection (R-MOB-03); the API still checks the role on every call.
 */
export async function verifyRole(session: Session): Promise<AppRole | 'out'> {
  try {
    const me = await apiFetch<Me>('/auth/me');
    const role = appRole(me.role);
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
