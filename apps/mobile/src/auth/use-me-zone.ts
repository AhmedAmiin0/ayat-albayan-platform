import {
  meLoaded,
  setViewerPersonTz,
  subscribeViewerTz,
  viewerTz,
  viewerTzFor,
} from '@ab/client-core';
import { useEffect, useState, useSyncExternalStore } from 'react';

/** GET /auth/me `tz`: the person's own zone (docs/34 §2); null when unset or not loaded. */
export function meTz(me: unknown): string | null {
  if (!meLoaded(me)) return null;
  const tz: unknown = Reflect.get(me, 'tz');
  return typeof tz === 'string' && tz !== '' ? tz : null;
}

/**
 * Feeds the viewer-zone store from /auth/me: the person's tz once it answers, null when signed out
 * (the phone's zone then). True once the store reads that zone, so the startup screen stays up
 * until the first time on screen can read it. Compared through the store's own device zone
 * (viewerTzFor), and latched per sign-in: a later tz change (an /auth/me refetch, the phone moving
 * zones) re-renders the times through useViewerTz instead of unmounting the app.
 */
export function useMeZone(me: unknown, signedIn: boolean): boolean {
  const tz = signedIn ? meTz(me) : null;
  const current = useSyncExternalStore(subscribeViewerTz, viewerTz);
  const [latched, setLatched] = useState<boolean | null>(null);
  useEffect(() => {
    setViewerPersonTz(tz);
  }, [tz]);
  const applied = current === viewerTzFor(tz);
  // Derived state, set while rendering (React's own pattern): true once applied, reset on sign-out.
  const next = signedIn ? latched === true || applied : null;
  if (next !== latched) setLatched(next);
  return next !== false;
}
