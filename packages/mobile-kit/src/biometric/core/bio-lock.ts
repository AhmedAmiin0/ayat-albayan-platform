import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../../lib/http/supabase';
import { t } from '../../lib/i18n/i18n';
import { bioFlags } from './flags';
import { type BioLockStore, BioLockStore as Store, type BioSnapshot } from './lock-store';
import { bioNative } from './native';

type AuthOn = Pick<typeof supabase.auth, 'onAuthStateChange'>;
type AppStateOn = Pick<typeof AppState, 'addEventListener'>;

/** What the lock listens to: the app's foreground and the session's sign-in / sign-out. */
export interface BioWires {
  appState: AppStateOn;
  auth: AuthOn;
  now: () => number;
}

/**
 * Feeds the store. 'inactive' (iOS app switcher) covers too, so its snapshot never shows the app.
 * A sign-in counts as fresh only when no session came before it (a restored one never offers).
 */
export function wireBioLock(lock: BioLockStore, wires: BioWires): void {
  wires.appState.addEventListener('change', (next: AppStateStatus) => {
    (next === 'active' ? lock.show : lock.hide)(wires.now());
  });
  let hadSession = false;
  const onAuth: Partial<Record<AuthChangeEvent, (fresh: boolean) => void>> = {
    SIGNED_IN: (fresh) => {
      if (fresh) void lock.signedIn();
    },
    SIGNED_OUT: () => lock.signedOut(),
  };
  // Supabase holds its auth lock in this callback: the store never calls back into it.
  wires.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    onAuth[event]?.(!hadSession);
    hadSession = session !== null;
  });
}

/** The app's one biometric lock (both apps, through @ab/mobile-kit). */
export const bioLock = new Store({
  native: bioNative(),
  flags: bioFlags(bioNative()),
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
