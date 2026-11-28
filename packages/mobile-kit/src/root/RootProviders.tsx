import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import type { GateStatus } from '../auth/use-auth-gate';
import { retryGate } from '../auth/gate-retry';
import { RootGateProvider } from '../auth/root-gate';
import { connectivity } from '../lib/connectivity/connectivity';
import { onCacheRestored, persistOptions, queryClient } from '../lib/query/query-client';
import { pathKey } from '../lib/query/query-keys';

/** Re-asks for the session, its role, /auth/me and the connection now. */
export function retryStartup() {
  retryGate();
  void queryClient.refetchQueries({ queryKey: pathKey('/auth/me') });
  connectivity.probeNow();
}

/**
 * The keyboard's frame-by-frame position (KeyboardFrame, KeyboardScroll; on Android it also follows
 * into a Modal's window), the persisted query cache and the root's gate, around every app's root.
 */
export function RootProviders({ gate, children }: { gate: GateStatus; children: ReactNode }) {
  return (
    <KeyboardProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={onCacheRestored}
        onError={onCacheRestored}
      >
        <RootGateProvider value={gate}>{children}</RootGateProvider>
      </PersistQueryClientProvider>
    </KeyboardProvider>
  );
}
