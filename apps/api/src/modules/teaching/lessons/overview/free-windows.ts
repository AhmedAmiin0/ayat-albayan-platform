import { DURATIONS, MINUTE_MS } from '@ab/shared';
import { expandRow, type TimeRange, type WeeklyRow } from '@/modules/people/teachers/availability/free-slots';
import { mergeIntervals, subtractIntervals, type Interval } from '@/modules/people/teachers/availability/intervals';
/** The shortest lesson: a shorter gap can never be booked, so it is not shown as free. */
const MIN_GAP = Math.min(...DURATIONS) * MINUTE_MS;

type TeacherSpansInput = {
  from: Date;
  to: Date;
  /** The teacher's weekly rows, wall-clock in their own tz (teacher_availability). */
  weekly: readonly WeeklyRow[];
  /** teacher_time_off overlapping the window, UTC. */
  timeOff: readonly TimeRange[];
  /** The teacher's occupying lessons (OCCUPYING_LESSON_STATUSES), UTC. */
  busy: readonly TimeRange[];
};

type TeacherSpans = { windows: Interval[]; free: Interval[] };

const toInterval = (r: TimeRange): Interval => ({ start: r.start.getTime(), end: r.end.getTime() });

/**
 * R-SCH-09 (all-teachers calendar): the teacher's weekly windows inside [from, to) — merged, so
 * 22:00–23:59 + 00:00–02:00 is one span across midnight, DST handled by expandRow — and the free
 * part of them: windows − time off − occupying lessons, gaps of at least 30 min. Sorted UTC.
 */
export function teacherSpans(input: TeacherSpansInput): TeacherSpans {
  const range = toInterval({ start: input.from, end: input.to });
  const windows = mergeIntervals(input.weekly.flatMap((row) => expandRow(row, range)))
    .map((w) => ({ start: Math.max(w.start, range.start), end: Math.min(w.end, range.end) }))
    .filter((w) => w.end > w.start);
  const blocked = [...input.timeOff, ...input.busy].map(toInterval);
  const free = subtractIntervals(windows, blocked).filter((f) => f.end - f.start >= MIN_GAP);
  return { windows, free };
}
