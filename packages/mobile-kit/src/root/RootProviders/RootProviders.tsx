import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RootGateProvider } from '../../auth/root-gate';
import { onCacheRestored, persistOptions, queryClient } from '../../lib/query/query-client';
import type { RootProvidersProps } from './RootProviders.types';

/** The persisted query cache and the root's gate, around every app's root (staff and family). */
export function RootProviders({ gate, children }: RootProvidersProps) {
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
