import type { OutsideSlot } from '@ab/shared';
import { clockOf } from '@ab/time';
import type { Clock } from '@ab/web-kit';
import { byLocalDay, zoneLabel, dayIn } from '@ab/web-kit';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import type { OutsideParams } from './OtherTime';

// Server instants as chips by the viewer's day; pure formatting, no clock read.

interface Option {
  value: string;
  label: string;
}
interface Zones {
  viewer: string;
  family: string;
}

/** What the list is asked for this draft: its teacher, length, students and moved trial. */
export function outsideParams(draft: BookingDraft): OutsideParams {
  const excludeLessonId = draft.trialDate?.upcomingId ?? undefined;
  const studentIds = draft.students.map((s) => s.id);
  return {
    teacherId: draft.teacher?.id ?? '',
    durationMin: draft.durationMin,
    studentIds,
    excludeLessonId,
  };
}

/** The day on show: the one picked while the list still has it, else the first. */
export function shownDay(days: Map<string, unknown>, picked: string | null): string | null {
  return picked !== null && days.has(picked) ? picked : ([...days.keys()][0] ?? null);
}

/** The viewer's days of the list, each with its starts in order. */
export const daysOf = (slots: readonly OutsideSlot[], viewer: string): Map<string, OutsideSlot[]> =>
  byLocalDay(slots, viewer);

export function dayOptions(days: Map<string, OutsideSlot[]>, viewer: string): Option[] {
  return [...days].map(([date, slots]) => ({
    value: date,
    label: dayIn(viewer)(slots[0]?.starts_at ?? date),
  }));
}

/** One chip per start: «12:00» or «11:00 · 12:00» (the family's clock beside the viewer's). */
export function timeOptions(slots: readonly OutsideSlot[], zones: Zones, clock: Clock): Option[] {
  return slots.map((s) => {
    const mine = clockOf(new Date(s.starts_at), { ...clock, tz: zones.viewer });
    const theirs = zoneLabel(s.starts_at, { tz: zones.family, base: zones.viewer }, clock);
    return { value: s.starts_at, label: theirs ? `${mine} · ${theirs}` : mine };
  });
}
