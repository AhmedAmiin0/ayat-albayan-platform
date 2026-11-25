// The screen shows 1-12 with AM/PM while the form holds 0-23 and saves "HH:MM"; pure.
import type { Locale } from '@ab/core';
import { meridiemLabel } from './clock';
import type { ClockCycle } from './clock-pref';

/** 00 is 12 AM and 12 is 12 PM. */
export function hourLabel(hour24: number, cycle: ClockCycle, locale: Locale): string {
  const h = ((hour24 % 24) + 24) % 24;
  if (cycle === '24') return String(h).padStart(2, '0');
  return `${h % 12 || 12} ${meridiemLabel(h < 12 ? 'am' : 'pm', locale)}`;
}
