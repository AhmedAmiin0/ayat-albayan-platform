import { useSyncExternalStore } from 'react';
import type { ConnState } from './connectivity-machine';
import type { ConnectivityStore } from './connectivity-store';

/** The live connection state of a store (the app's `connectivity`, or a test's own). */
export function useConnectivity(store: ConnectivityStore): ConnState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
