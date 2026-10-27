// Clock format (owner 2026-10-27, «add using 12/24 hour based»): times show in 12-hour or 24-hour
// form. Same model as the language: the device decides by default; one override per device.
// Display only: the DB, API payloads and stored «HH:MM» values stay 24 h (rule 6).

export const CLOCK_PREFS = ['auto', '12', '24'] as const;
/** The saved choice: follow the device, or force 12 h / 24 h. */
export type ClockPref = (typeof CLOCK_PREFS)[number];
/** The form in effect on screen. */
export type ClockCycle = '12' | '24';
export const DEFAULT_CLOCK_PREF: ClockPref = 'auto';
/** localStorage (web) / AsyncStorage (mobile) key of the saved choice. */
export const CLOCK_STORAGE_KEY = 'ab.clock';

/** A saved value back to a ClockPref; anything unknown, or nothing saved, is «auto». */
export function parseClockPref(value: unknown): ClockPref {
  return value === '12' || value === '24' ? value : DEFAULT_CLOCK_PREF;
}

/**
 * The cycle in effect: an override wins; «auto» follows the device. A device that can't say
 * (`null` / `undefined`) reads as 24 h, the app's form before this setting existed.
 */
export function resolveHourCycle(pref: ClockPref, deviceUses24: boolean | null | undefined): ClockCycle {
  if (pref !== 'auto') return pref;
  return deviceUses24 === false ? '12' : '24';
}

/** Intl's resolved `hourCycle` (web) → does the device use 24 h? h11/h12 = no; anything else = yes. */
export function uses24FromHourCycle(hourCycle: string | undefined): boolean | null {
  if (hourCycle === undefined) return null;
  return hourCycle !== 'h11' && hourCycle !== 'h12';
}
