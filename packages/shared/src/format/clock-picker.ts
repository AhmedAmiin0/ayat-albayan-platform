// Time pickers in 12 h: the screen shows 1–12 with ص / م (AM / PM), the form still holds 0–23 and
// saves «HH:MM» 24 h. Pure, so pickers on web and mobile share it.
import type { Locale } from '../i18n/index.js';
import type { ClockCycle } from './clock-pref.js';

export type Meridiem = 'am' | 'pm';

/** 0–23 → { hour: 1–12, meridiem } (00 → 12 ص, 12 → 12 م). */
export function toTwelve(hour24: number): { hour: number; meridiem: Meridiem } {
  const h = ((hour24 % 24) + 24) % 24;
  return { hour: h % 12 || 12, meridiem: h < 12 ? 'am' : 'pm' };
}

/** 1–12 + meridiem → 0–23 (12 ص → 0, 12 م → 12). */
export function fromTwelve(hour12: number, meridiem: Meridiem): number {
  const h = hour12 % 12;
  return meridiem === 'pm' ? h + 12 : h;
}

/** «ص» / «م» or «AM» / «PM». */
export function meridiemLabel(meridiem: Meridiem, locale: Locale): string {
  if (locale === 'ar') return meridiem === 'am' ? 'ص' : 'م';
  return meridiem === 'am' ? 'AM' : 'PM';
}

/** An hour chip/option label: «17» (24) or «5 م» / «5 PM» (12). */
export function hourLabel(hour24: number, cycle: ClockCycle, locale: Locale): string {
  if (cycle === '24') return String(((hour24 % 24) + 24) % 24).padStart(2, '0');
  const { hour, meridiem } = toTwelve(hour24);
  return `${hour} ${meridiemLabel(meridiem, locale)}`;
}

/** Same hour, other half of the day (the ص / م toggle of a 12 h picker). */
export function flipMeridiem(hour24: number): number {
  return (((hour24 % 24) + 24) % 24 + 12) % 24;
}
