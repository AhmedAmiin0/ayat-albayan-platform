import { getCalendars } from 'expo-localization';

/**
 * Does the phone show 24-hour times? expo-localization reads the OS setting (no native change:
 * the module ships in the current build). Unknown or unreadable → null, which reads as 24 h.
 */
export function deviceUses24(): boolean | null {
  try {
    return getCalendars()[0]?.uses24hourClock ?? null;
  } catch {
    return null;
  }
}
