// Time pickers in 12 h: the screen shows 1–12 with ص / م (AM / PM), the form still holds 0–23 and
// saves «HH:MM» 24 h. Pure, so pickers on web and mobile share it.
import type { Locale } from '../i18n/index.js';
import { meridiemLabel } from './clock.js';
import type { ClockCycle } from './clock-pref.js';

/** An hour chip/option label: «17» (24) or «5 م» / «5 PM» (12); 00 → «12 ص», 12 → «12 م». */
export function hourLabel(hour24: number, cycle: ClockCycle, locale: Locale): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (cycle === '24') return String(h).padStart(2, '0');
  return `${h % 12 || 12} ${meridiemLabel(h < 12 ? 'am' : 'pm', locale)}`;
}
