import { subscribeViewerTz, viewerTz } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// The zone every time on a web screen reads in (docs/34 §2): the signed-in person's tz from
// GET /auth/me (set by meQuery), else this browser's, else the academy's. Like useClock(), a
// sign-in or sign-out re-renders the times on screen. Code outside React calls viewerTz().

/** The viewer's IANA zone, e.g. 'Africa/Cairo'. */
export function useViewerTz(): string {
  return useSyncExternalStore(subscribeViewerTz, viewerTz);
}
