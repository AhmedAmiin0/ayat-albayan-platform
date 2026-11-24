import { useSyncExternalStore } from 'react';
import { subscribeViewerTz, viewerTz } from '@ab/client-core';
import type { ClockOptions } from '@ab/time';
import { locale, useClockCycle } from '@ab/mobile-kit';

/**
 * The viewer's clock: this phone's zone, its 12 / 24 h cycle and the UI language. A lesson's own
 * time is written on the student's zone (`{ ...clock, tz: student.tz }`).
 */
export function useFamilyClock(): ClockOptions {
  const tz = useSyncExternalStore(subscribeViewerTz, viewerTz);
  return { tz, cycle: useClockCycle(), locale };
}
