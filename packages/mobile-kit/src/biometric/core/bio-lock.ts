import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../../lib/http/supabase';
import { t } from '../../lib/i18n/i18n';
import { bioFlags } from './flags';
import type { BioSnapshot } from './lock-deps';
import { type BioLockStore, BioLockStore as Store } from './lock-store';
import { bioNative } from './native';

type AuthOn = Pick<typeof supabase.auth, 'onAuthStateChange'>;
type AppStateOn = Pick<typeof AppState, 'addEventListener'>;

/** What the lock listens to: the app's foreground and the session's sign-in / sign-out. */
export interface BioWires {
  appState: AppStateOn;
  auth: AuthOn;
  now: () => number;
}

type Known = 'unknown' | 'none' | 'some';
const sessionKnown = (session: Session | null): Known => (session ? 'some' : 'none');
const settled = (before: Known, event: AuthChangeEvent) =>
  before !== 'unknown' || event === 'INITIAL_SESSION';

/**
 * Feeds the store. 'inactive' (iOS app switcher) covers too, so its snapshot never shows the app.
 * A sign-in counts as fresh only when no session came before it (a restored one never offers).
 */
export function wireBioLock(lock: BioLockStore, wires: BioWires): void {
  wires.appState.addEventListener('change', (next: AppStateStatus) => {
    (next === 'active' ? lock.show : lock.hide)(wires.now());
  });
  // unknown until INITIAL_SESSION: a restored session can send SIGNED_IN before it (auth-js).
  let known: Known = 'unknown';
  const onAuth: Partial<Record<AuthChangeEvent, () => void>> = {
    SIGNED_IN: () => {
      if (known === 'none') void lock.signedIn();
    },
    SIGNED_OUT: () => lock.signedOut(),
  };
  // Supabase holds its auth lock in this callback: the store never calls back into it.
  wires.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    const before = known;
    onAuth[event]?.();
    known = settled(before, event) ? sessionKnown(session) : before;
  });
}

/** The app's one biometric lock (both apps, through @ab/mobile-kit). */
const native = bioNative();
export const bioLock = new Store({
  native,
  flags: bioFlags(native),
  text: () => ({
    reason: t.biometric.promptReason,
    enableReason: t.biometric.enableReason,
    cancel: t.biometric.cancel,
  }),
});
wireBioLock(bioLock, { appState: AppState, auth: supabase.auth, now: Date.now });
void bioLock.boot();

/** The lock's state, live. */
export function useBioLock(): BioSnapshot {
  return useSyncExternalStore(bioLock.subscribe, bioLock.getSnapshot);
}
