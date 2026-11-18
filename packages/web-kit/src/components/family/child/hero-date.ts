import { dateText, hijriText, type DateTextOptions } from '@ab/shared';

const GREGORIAN = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/**
 * The hero's date pill (boards: «السبت 15 نوفمبر»): today on the student's clock, with the Umm
 * al-Qura date after it where the browser knows that calendar.
 */
export function heroDate(now: Date, opts: DateTextOptions): string {
  return [dateText(now, opts, GREGORIAN), hijriText(now, opts)].filter(Boolean).join(' · ');
}
