import { clockTime, type Gender, type Program } from '@ab/shared';
import type { Range } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';
import { teacherRows } from './lessons';
import type { BoardLesson, OverviewTeacher, OverviewTimeOff, Span } from './overview-types';
import { addDays, RIYADH_TZ, zonedToUtc } from './tz';

// All-teachers calendar view logic (R-SCH-01): filters on the one cached overview, and a teacher's
// spans cut to a Riyadh day as "HH:MM" ranges for the 08–24 track. Pure, unit-tested.

const MIN = 60_000;
const QUARTER = 15 * MIN;
/** Same floor as the API's free gaps (the shortest lesson). */
const MIN_GAP = 30 * MIN;
const TRACK_START = 8 * 60 * MIN;

export interface TeacherFilter {
  program?: Program | undefined;
  gender?: Gender | undefined;
  /** Picked teachers; empty or undefined = everyone. */
  ids?: readonly string[] | undefined;
}

export function filterTeachers(teachers: readonly OverviewTeacher[], f: TeacherFilter): OverviewTeacher[] {
  return teachers.filter(
    (x) =>
      (!f.program || x.programs.includes(f.program)) &&
      (!f.gender || x.gender === f.gender) &&
      (!f.ids?.length || f.ids.includes(x.id)),
  );
}

export interface BoardRow {
  teacher: OverviewTeacher;
  /** Riyadh day → that day's lessons by start time. */
  days: Map<string, BoardLesson[]>;
}

/** One row per teacher, lessons or not (a teacher with an empty week still shows). */
export function boardRows(teachers: readonly OverviewTeacher[], lessons: readonly BoardLesson[]): BoardRow[] {
  const byTeacher = new Map(teacherRows(lessons).map((r) => [r.teacher.id, r.days]));
  return teachers.map((teacher) => ({ teacher, days: byTeacher.get(teacher.id) ?? new Map() }));
}

/** [from, to) of a Riyadh day, epoch ms. */
export function dayBounds(day: string): { from: number; to: number } {
  return { from: zonedToUtc(day, '00:00', RIYADH_TZ).getTime(), to: zonedToUtc(addDays(day, 1), '00:00', RIYADH_TZ).getTime() };
}

/** Spans cut to one Riyadh day; with `after`, only what is left after that instant. */
export function clipSpans(spans: readonly Span[], day: string, after?: number): Span[] {
  const bounds = dayBounds(day);
  const from = Math.max(bounds.from, after ?? bounds.from);
  return spans.flatMap((s) => {
    const start = Math.max(Date.parse(s.starts_at), from);
    const end = Math.min(Date.parse(s.ends_at), bounds.to);
    return end > start ? [{ starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() }] : [];
  });
}

/** A span of `day` as Riyadh "HH:MM"; one that runs to midnight ends at "24:00", not "00:00". */
export function spanRange(span: Span, day: string): Range {
  const end = Date.parse(span.ends_at) >= dayBounds(day).to ? '24:00' : clockTime(new Date(span.ends_at), RIYADH_TZ);
  return { start: clockTime(new Date(span.starts_at), RIYADH_TZ), end };
}

/** "3:30" for 210 minutes (the free total). */
export function hoursText(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** «فاضي 17:00 – 19:00». */
export function freeText(range: Range): string {
  return t.schedule.free.replace('{from}', range.start).replace('{to}', range.end);
}

export interface TeacherDay {
  windows: Range[];
  off: Range[];
  /** The day's lessons as track ticks. */
  ticks: Range[];
  /** Bookable free gaps: from now on, at least 30 min. */
  gaps: Span[];
  freeMin: number;
  /** Time off covering the whole 08–24 track: one «إجازة» note instead of the track. */
  dayOff: OverviewTimeOff | null;
}

export interface DayInput {
  day: string;
  /** That teacher's lessons shown on `day`. */
  lessons: readonly BoardLesson[];
  now: Date;
}

/** One teacher's Riyadh day: availability, time off, lesson ticks and what is still free. */
export function teacherDay(teacher: OverviewTeacher, { day, lessons, now }: DayInput): TeacherDay {
  const ranges = (spans: readonly Span[]) => clipSpans(spans, day).map((s) => spanRange(s, day));
  const after = Math.ceil(now.getTime() / QUARTER) * QUARTER;
  const gaps = clipSpans(teacher.free, day, after).filter((s) => Date.parse(s.ends_at) - Date.parse(s.starts_at) >= MIN_GAP);
  const bounds = dayBounds(day);
  return {
    windows: ranges(teacher.windows),
    off: ranges(teacher.time_off),
    ticks: ranges(lessons),
    gaps,
    freeMin: gaps.reduce((sum, s) => sum + (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / MIN, 0),
    dayOff:
      teacher.time_off.find((o) => Date.parse(o.starts_at) <= bounds.from + TRACK_START && Date.parse(o.ends_at) >= bounds.to) ??
      null,
  };
}

/** [from, to) of a Riyadh day as Dates (the day view's request window). */
export function dayWindow(day: string): { from: Date; to: Date } {
  const b = dayBounds(day);
  return { from: new Date(b.from), to: new Date(b.to) };
}
