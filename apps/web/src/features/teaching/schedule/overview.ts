import {
  addDays,
  clockTime,
  type Gender,
  type LessonView,
  type OverviewTeacher,
  type OverviewTimeOff,
  type Program,
  type Span,
  wallInstant,
} from '@ab/shared';
import type { Range } from '@/features/people/teachers/availability/grid';
import { t } from '@/lib/i18n/i18n';
import { teacherRows } from './lesson/lessons';
import type { Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';

// All-teachers calendar view logic (R-SCH-01): filters on the one cached overview, and a teacher's
// spans cut to a day of the viewer's zone (docs/34) as "HH:MM" ranges for the 08–24 track.
// Pure, unit-tested.

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
  /** Viewer's day → that day's lessons by start time. */
  days: Map<string, LessonView[]>;
  /** The teacher's photo (OverviewTeacher.avatar_url, so a teacher without lessons in the window still has it); null = initials. */
  photo: string | null;
}

/**
 * One row per teacher, lessons or not (a teacher with an empty week still shows); days in `tz`,
 * the viewer's zone (useViewerTz()).
 */
export function boardRows(
  teachers: readonly OverviewTeacher[],
  lessons: readonly LessonView[],
  tz: string,
): BoardRow[] {
  const byTeacher = new Map(teacherRows(lessons, tz).map((r) => [r.teacher.id, r.days]));
  return teachers.map((teacher) => ({ teacher, days: byTeacher.get(teacher.id) ?? new Map(), photo: teacher.avatar_url ?? null }));
}

/** [from, to) of a day in `tz` (the viewer's), epoch ms. */
export function dayBounds(day: string, tz: string): { from: number; to: number } {
  const at = (d: string) => wallInstant(d, '00:00', tz).getTime();
  return { from: at(day), to: at(addDays(day, 1)) };
}

export interface ClipOptions {
  /** The viewer's day, in `tz` (the viewer's zone, useViewerTz()). */
  day: string;
  tz: string;
  /** Only what is left after this instant (epoch ms). */
  after?: number | undefined;
}

/** Spans cut to one viewer's day; with `after`, only what is left after that instant. */
export function clipSpans(spans: readonly Span[], { day, tz, after }: ClipOptions): Span[] {
  const bounds = dayBounds(day, tz);
  const from = Math.max(bounds.from, after ?? bounds.from);
  return spans.flatMap((s) => {
    const start = Math.max(Date.parse(s.starts_at), from);
    const end = Math.min(Date.parse(s.ends_at), bounds.to);
    return end > start ? [{ starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() }] : [];
  });
}

/** A span of `day` as viewer's "HH:MM" keys (freeText shows them in the viewer's cycle); one that runs to midnight ends at "24:00", not "00:00". */
export function spanRange(span: Span, day: string, tz: string): Range {
  const end = Date.parse(span.ends_at) >= dayBounds(day, tz).to ? '24:00' : clockTime(new Date(span.ends_at), tz);
  return { start: clockTime(new Date(span.starts_at), tz), end };
}

/** "3:30" for 210 minutes (the free total). */
export function hoursText(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** «فاضي 17:00 – 19:00». */
export function freeText(range: Range, clock: Clock): string {
  return t.schedule.free.replace('{from}', hhmmText(range.start, clock)).replace('{to}', hhmmText(range.end, clock));
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
  lessons: readonly LessonView[];
  now: Date;
  /** The viewer's zone (useViewerTz()): `day` is a day of it. */
  tz: string;
}

/** One teacher's viewer-zone day: availability, time off, lesson ticks and what is still free. */
export function teacherDay(teacher: OverviewTeacher, { day, lessons, now, tz }: DayInput): TeacherDay {
  const ranges = (spans: readonly Span[]) => clipSpans(spans, { day, tz }).map((s) => spanRange(s, day, tz));
  const after = Math.ceil(now.getTime() / QUARTER) * QUARTER;
  const long = (s: Span) => Date.parse(s.ends_at) - Date.parse(s.starts_at) >= MIN_GAP;
  const gaps = clipSpans(teacher.free, { day, tz, after }).filter(long);
  const bounds = dayBounds(day, tz);
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

/** [from, to) of a viewer's day as Dates (the day view's request window). */
export function dayWindow(day: string, tz: string): { from: Date; to: Date } {
  const b = dayBounds(day, tz);
  return { from: new Date(b.from), to: new Date(b.to) };
}
