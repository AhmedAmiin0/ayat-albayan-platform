import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { clearQueryCaches } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import type { AppRole } from './role-claim';
import { verifyRole } from './verify-role';

export type GateStatus = 'booting' | AppRole | 'out';

/** Only these move the gate; TOKEN_REFRESHED / USER_UPDATED keep the current answer. */
export function movesGate(event: AuthChangeEvent, session: Session | null): boolean {
  return !session || event === 'INITIAL_SESSION' || event === 'SIGNED_IN';
}

/** No session → out, and nothing of it stays cached. A new or restored session → ask its role. */
export async function resolveGate(
  session: Session | null,
  set: (status: GateStatus) => void,
): Promise<void> {
  if (session) return set(await verifyRole(session));
  set('out');
  await clearQueryCaches();
}

/**
 * Root-layout gate (R-MOB-01, R-AUTH-01): 'booting' until the stored session is restored and
 * checked, then the app role ('admin', 'teacher', 'sales', 'assistant') or 'out'. Every sign-out path (button, 401, failed refresh)
 * arrives here as SIGNED_OUT. Only the latest event may set the status, so a slow check can't reopen a signed-out app.
 */
export function useAuthGate(): GateStatus {
  const [status, setStatus] = useState<GateStatus>('booting');
  useEffect(() => {
    let latest = 0;
    let live = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!movesGate(event, session)) return;
      const mine = ++latest;
      const set = (next: GateStatus) => {
        if (live && mine === latest) setStatus(next);
      };
      // Supabase holds its auth lock during this callback; calling back into it here deadlocks.
      setTimeout(() => void resolveGate(session, set), 0);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return status;
}
