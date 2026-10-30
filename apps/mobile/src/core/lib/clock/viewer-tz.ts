import { subscribeViewerTz, viewerTz } from '@ab/client-core';
import type { ClockCycle } from '@ab/shared';
import { useSyncExternalStore } from 'react';

// The zone every time on screen reads in (docs/34 §2): the signed-in person's tz from /auth/me,
// else the phone's, else the academy's. One store (@ab/client-core), set by useMeZone (auth).

/** The viewer's IANA zone; re-renders when /auth/me answers or on sign-out. */
export function useViewerTz(): string {
  return useSyncExternalStore(subscribeViewerTz, viewerTz);
}

/** The viewer's zone and 12 / 24 h cycle, both read in render (useViewerTz, useClockCycle). */
export interface ViewerClock {
  tz: string;
  cycle: ClockCycle;
}
