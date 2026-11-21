import type { AnyRouter } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';

/** The router's pathname from outside RouterProvider (the gate wraps it). */
export function useRoutePath(router: AnyRouter): string {
  return useSyncExternalStore(
    (onChange) => router.subscribe('onResolved', onChange),
    () => router.state.location.pathname,
  );
}
