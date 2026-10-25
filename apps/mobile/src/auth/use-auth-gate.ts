import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { clearQueryCaches } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { silencePush } from '@/push/silence-push';
import type { AppRole } from './role-claim';
import { verifyRole } from './verify-role';

export type GateStatus = 'booting' | AppRole | 'out';

/** The longest the login screen waits on the OS push unregister (it never throws, may be slow). */
export const SILENCE_WAIT_MS = 1500;

/** Only these move the gate; TOKEN_REFRESHED / USER_UPDATED keep the current answer. */
export function movesGate(event: AuthChangeEvent, session: Session | null): boolean {
  return !session || event === 'INITIAL_SESSION' || event === 'SIGNED_IN';
}

/**
 * No session → out, nothing of it stays cached, and the OS stops delivering this app's pushes, as
 * the sign-out button does: also when GoTrue signed the app out on its own (a reused or revoked
 * refresh token), whose server session and token binding may live on. A new or restored session →
 * ask its role (the next registration turns pushes back on).
 */
export async function resolveGate(
  session: Session | null,
  set: (status: GateStatus) => void,
): Promise<void> {
  if (session) return set(await verifyRole(session));
  // Before the login screen shows; registerPush also waits for a slower one (silenceSettled).
  await Promise.race([silencePush(), new Promise((resolve) => setTimeout(resolve, SILENCE_WAIT_MS))]);
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
