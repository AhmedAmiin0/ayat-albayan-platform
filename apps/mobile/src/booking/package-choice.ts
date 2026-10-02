import type { BookingResult, Duration } from '@ab/shared';
import type { Href } from 'expo-router';
import { localDate } from '@/today/timeline';
import type { TrialDraft } from './draft';
import { ruleFromSlot } from './slots';

// The booking's package (R-SCH-06, R-SUB-01): the lead screen books a trial; the chat's «اشترك»
// may book a paid package instead, which repeats weekly on the picked days (R-SCH-02 byday).

/** ponytail: every quick trial is 45 minutes (the web wizard's default); add a length picker if trials vary. */
export const TRIAL_MINUTES: Duration = 45;

type PackageFields = Pick<TrialDraft, 'pkg' | 'durationMin' | 'byday' | 'startsAt' | 'tz'>;

/** The lesson length the slots and the rule use: a trial is always TRIAL_MINUTES. */
export function lessonMinutes(d: Pick<TrialDraft, 'pkg' | 'durationMin'>): Duration {
  return d.pkg === 'trial' ? TRIAL_MINUTES : d.durationMin;
}

/**
 * The rule's weekdays (0 = الأحد): the first slot's day always; a trial only that one (docs/10
 * invariant 4), a paid package that one plus the picked repeat days, sorted, no repeats.
 */
export function effectiveByday(d: PackageFields): number[] {
  if (!d.startsAt) return [];
  const { weekday } = ruleFromSlot(d.startsAt, d.tz);
  if (d.pkg === 'trial') return [weekday];
  return [...new Set([weekday, ...d.byday])].sort((a, b) => a - b);
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
