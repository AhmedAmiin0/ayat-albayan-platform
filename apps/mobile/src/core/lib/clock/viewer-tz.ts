import { subscribeViewerTz, viewerTz } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// The zone every time on screen reads in (docs/34 §2): the signed-in person's tz from /auth/me,
// else the phone's, else the academy's. One store (@ab/client-core), set by useMeZone (auth).

/** The viewer's IANA zone; re-renders when /auth/me answers or on sign-out. */
export function useViewerTz(): string {
  return useSyncExternalStore(subscribeViewerTz, viewerTz);
}
