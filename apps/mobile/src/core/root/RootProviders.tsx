import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { type GateStatus, retryGate, RootGateProvider } from '@/core/auth';
import { connectivity } from '@/core/lib/connectivity/connectivity';
import { onCacheRestored, persistOptions, queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';

/**
 * «إعادة المحاولة» on the startup screen: the session and its role again, /auth/me, and the
 * connection now.
 */
export function retryStartup() {
  retryGate();
  void queryClient.refetchQueries({ queryKey: pathKey('/auth/me') });
  connectivity.probeNow();
}

/** The persisted query cache and the root's gate, around every app's root (staff and family). */
export function RootProviders({ gate, children }: { gate: GateStatus; children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={onCacheRestored}
      onError={onCacheRestored}
    >
      <RootGateProvider value={gate}>{children}</RootGateProvider>
    </PersistQueryClientProvider>
  );
}
