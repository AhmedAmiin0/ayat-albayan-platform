import {
  CLOCK_STORAGE_KEY,
  parseClockPref,
  resolveHourCycle,
  uses24FromHourCycle,
  type ClockCycle,
  type ClockPref,
  type Locale,
} from '@ab/shared';
import { useMemo, useSyncExternalStore } from 'react';
import { locale } from '@/lib/i18n/locale';

// «تنسيق الوقت» (owner 2026-10-27): follow the browser's locale, or 12 h / 24 h saved in this
// browser (localStorage, like the language). A change re-renders every time on screen, no reload.

function readPref(): ClockPref {
  try {
    return parseClockPref(localStorage.getItem(CLOCK_STORAGE_KEY));
  } catch {
    return 'auto'; // storage blocked (private mode)
  }
}

/** Does this browser's locale use 24-hour times? h11/h12 → no; unknown → null (reads as 24 h). */
export function deviceUses24(): boolean | null {
  try {
    return uses24FromHourCycle(new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle);
  } catch {
    return null;
  }
}

let pref: ClockPref = readPref();
const device = deviceUses24();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The cycle in effect now (for code outside React); components use useClock(). */
export function clockCycle(): ClockCycle {
  return resolveHourCycle(pref, device);
}

const clockPref = (): ClockPref => pref;

/** Applies at once («auto» clears the saved choice), then saves. */
export function setClockPref(next: ClockPref): void {
  pref = next;
  try {
    if (next === 'auto') localStorage.removeItem(CLOCK_STORAGE_KEY);
    else localStorage.setItem(CLOCK_STORAGE_KEY, next);
  } catch {
    // storage blocked: the choice still applies for this page view
  }
  listeners.forEach((listener) => listener());
}

export function useClockPref(): ClockPref {
  return useSyncExternalStore(subscribe, clockPref);
}

/** `{ cycle, locale }` for the shared clock formatters (clockOf, clockOfHhmm, clockRange). */
export function useClock(): { cycle: ClockCycle; locale: Locale } {
  const cycle = useSyncExternalStore(subscribe, clockCycle);
  return useMemo(() => ({ cycle, locale }), [cycle]);
}
