import { wallParts, type Conflict } from '@ab/shared';
import { WEEK_ORDER } from '@/features/people/teachers/availability/grid';
import { t } from '@/lib/i18n/i18n';
import { draftPicks } from '../../draft/draft.days';
import type { BookingDraft } from '../../draft/draft';

// «تابِع بنفس الأيام» (owner 2026-10-18): a renewal opens with the previous course's days picked. When
// the series check finds a clash on one of those days, the slot step names the day so she picks
// another time for it (tapping another slot that day replaces it, togglePick). Pure.

type TakenInput = Pick<BookingDraft, 'course' | 'tz' | 'startsAt' | 'extra' | 'kind'>;

const weekday: Record<string, string> = t.enums.weekday;

/** The weekdays (family zone) of the still-prefilled picks that a clash falls on, Saturday first. */
export function takenDays(d: TakenInput, conflicts: readonly Conflict[]): number[] {
  const prefilled = d.course?.prefilled ?? [];
  if (prefilled.length === 0) return [];
  const kept = new Set(draftPicks(d).filter((p) => prefilled.some((x) => x.at === p)).map((p) => wallParts(p, d.tz).weekday));
  const hit = new Set(conflicts.map((c) => wallParts(c.startsAt, d.tz).weekday).filter((w) => kept.has(w)));
  return WEEK_ORDER.filter((w) => hit.has(w));
}

/** «موعد الأحد لم يعد متاحًا، اختر وقتًا آخر لهذا اليوم», one line per day. */
export const takenTexts = (d: TakenInput, conflicts: readonly Conflict[]): string[] =>
  takenDays(d, conflicts).map((w) => t.booking.courseChange.continueTaken.replace('{day}', weekday[String(w)] ?? ''));
