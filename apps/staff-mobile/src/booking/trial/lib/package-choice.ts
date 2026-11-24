import type { Duration, PackageSize } from '@ab/catalog';
import { counted } from '@ab/core';
import { packagePerWeek } from '@ab/money';
import type { BookingResult } from '@ab/schedule';
import type { Href } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { localDate } from '@/today/lib/timeline';
import type { TrialDraft } from './draft';
import { NO_PICKS, picksOf } from '@/booking/shared/picks';
import { ruleFromSlot } from '@/booking/shared/slots';

// R-SCH-06, R-SUB-01: a paid package repeats weekly on the picked days (R-SCH-02 byday).

/** The registration form offers these five; 20 and 28 stay in the DB only. */
export const REGISTRATION_SIZES = ['trial', '4', '8', '12', '16'] as const satisfies readonly PackageSize[];

/** The paid sizes once the booking type is package; the trial is its own type. */
export const PAID_SIZES = ['4', '8', '12', '16'] as const satisfies readonly PackageSize[];

/** Switching type resets the slot, weekly days and invoice; a package starts at 8. */
export function kindPatch(kind: TrialDraft['kind']): Partial<TrialDraft> {
  return { kind, pkg: kind === 'trial' ? 'trial' : '8', invoice: null, ...NO_PICKS };
}

/** The form's default when the family is unsure. */
export const DEFAULT_MINUTES: Duration = 45;

type PackageFields = Pick<TrialDraft, 'pkg' | 'extra' | 'startsAt' | 'tz'>;

/** Weekday 0 is Sunday; a trial uses only its slot's day (docs/10 invariant 4). */
export function effectiveByday(d: PackageFields): number[] {
  const picks = d.pkg === 'trial' ? picksOf({ startsAt: d.startsAt, extra: [] }) : picksOf(d);
  return [...new Set(picks.map((p) => ruleFromSlot(p, d.tz).weekday))].sort((a, b) => a - b);
}

/**
 * After a paid package is booked: its subscription for the new child, prefilled with the package
 * size, the lesson length and the first lesson's local day. null for a trial (nothing to pay yet).
 */
export function subscriptionHref(d: TrialDraft, result: BookingResult): Href | null {
  const [studentId] = result.student_ids;
  if (d.pkg === 'trial' || !studentId) return null;
  const [first] = result.lessons.map((l) => l.starts_at).sort();
  const startsOn = first ? { startsOn: localDate(new Date(first), d.tz) } : {};
  const params = { studentId, pkg: d.pkg, minutes: String(d.durationMin), ...startsOn };
  return { pathname: '/inbox/subscribe', params };
}

/** Warns when weekly days don't match the package; a note, not a fix; null when matched. */
export function packageDaysNote(pkg: PackageSize, days: number): string | null {
  const perWeek = packagePerWeek(pkg);
  if (perWeek === null || perWeek === days) return null;
  return t.booking.packageDays
    .replace('{package}', t.enums.packageSize[pkg])
    .replace('{perWeek}', counted(t.booking.perWeek, perWeek));
}
