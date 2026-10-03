import { counted, packagePerWeek, type BookingResult, type Duration, type PackageSize } from '@ab/shared';
import type { Href } from 'expo-router';
import { t } from '@/lib/i18n';
import { localDate } from '@/today/timeline';
import type { TrialDraft } from './draft';
import { ruleFromSlot } from './slots';

// The booking's package (R-SCH-06, R-SUB-01): the lead screen books a trial; the chat's «اشترك»
// may book a paid package instead, which repeats weekly on the picked days (R-SCH-02 byday).

/** «الباقة المطلوبة»: the registration form offers these five; 20 and 28 stay in the DB only. */
export const REGISTRATION_SIZES = ['trial', '4', '8', '12', '16'] as const satisfies readonly PackageSize[];

/** The form's «المده» default: «لو مش متأكد سيبها وهنحسبها 45 دقيقة». */
export const DEFAULT_MINUTES: Duration = 45;

type PackageFields = Pick<TrialDraft, 'pkg' | 'byday' | 'startsAt' | 'tz'>;

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

/**
 * «الباقة 8 حلقات في الشهر = مرتين في الأسبوع» when the weekly days don't add up to the package
 * (as the web): one day a week for 8 a month books half of what is charged. A note, not a fix: which
 * extra day the family wants is the admin's choice. null when they match, or for a trial.
 */
export function packageDaysNote(pkg: PackageSize, days: number): string | null {
  const perWeek = packagePerWeek(pkg);
  if (perWeek === null || perWeek === days) return null;
  return t.booking.packageDays
    .replace('{package}', t.enums.packageSize[pkg])
    .replace('{perWeek}', counted(t.booking.perWeek, perWeek));
}
