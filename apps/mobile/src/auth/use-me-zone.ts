import { meLoaded, setViewerPersonTz, subscribeViewerTz, viewerTz } from '@ab/client-core';
import { deviceTimeZone, resolveViewerTz } from '@ab/shared';
import { useEffect, useSyncExternalStore } from 'react';

/** GET /auth/me `tz`: the person's own zone (docs/34 §2); null when unset or not loaded. */
export function meTz(me: unknown): string | null {
  if (!meLoaded(me)) return null;
  const tz: unknown = Reflect.get(me, 'tz');
  return typeof tz === 'string' && tz !== '' ? tz : null;
}

/**
 * Feeds the viewer-zone store from /auth/me: the person's tz once it answers, null when signed out
 * (the phone's zone then). True once the store reads that zone, so the startup screen stays up
 * until every time on screen can read it (text helpers call viewerTz() without subscribing).
 */
export function useMeZone(me: unknown, signedIn: boolean): boolean {
  const tz = signedIn ? meTz(me) : null;
  const current = useSyncExternalStore(subscribeViewerTz, viewerTz);
  useEffect(() => {
    setViewerPersonTz(tz);
  }, [tz]);
  return current === resolveViewerTz({ person: tz, device: deviceTimeZone() });
}
