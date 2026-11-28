import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { RootGateProvider } from '../../auth/root-gate';
import { onCacheRestored, persistOptions, queryClient } from '../../lib/query/query-client';
import type { RootProvidersProps } from './RootProviders.types';

/**
 * The keyboard's frame-by-frame position (KeyboardFrame, KeyboardScroll; on Android it also follows
 * into a Modal's window), the persisted query cache and the root's gate, around every app's root.
 */
export function RootProviders({ gate, children }: RootProvidersProps) {
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
