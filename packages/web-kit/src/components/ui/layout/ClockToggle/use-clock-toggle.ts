import { setClockPref, useClockPref } from '@ab/web-kit/lib/clock';
import type { ClockToggleState } from './ClockToggle.types';

export function useClockToggle(): ClockToggleState {
  return { pref: useClockPref(), choose: setClockPref };
}
