import { RIYADH_TZ, type Gender, type Program } from '@ab/shared';
import { localDate, visibleLessons } from '@/today/timeline';
import { agendaDays } from './agenda';
import type {
  OverviewLesson,
  OverviewTeacher,
  OverviewTimeOff,
  ScheduleOverview,
  Span,
} from './overview-types';
import { addDays, riyadhMidnight } from './week';

// «الجدول» for every teacher (R-SCH-01, R-TCH-02): the overview cut to one Riyadh day or the
// whole week, filtered by program and gender. Rows come from the teachers, so a teacher with
// nothing booked still shows. Windows and free time are the API's; here they are only clipped.

export type ScheduleView = 'day' | 'week';

export interface TeacherFilter {
  program: Program | 'all';
  gender: Gender | 'all';
}

export type AgendaItem =
  | { kind: 'lesson'; lesson: OverviewLesson }
  | { kind: 'free'; span: Span }
  /** Week view: the Riyadh day the next lessons fall on. */
  | { kind: 'day'; date: string };

export interface TeacherAgenda {
  teacher: OverviewTeacher;
  items: AgendaItem[];
  /** Availability inside the period (the day view's «متاح» line). */
  windows: Span[];
  timeOff: OverviewTimeOff[];
}

export interface AgendaOptions {
  /** First Riyadh day shown (YYYY-MM-DD). */
  start: string;
  view: ScheduleView;
  filter: TeacherFilter;
}

const ms = (iso: string) => Date.parse(iso);

function clip(span: Span, from: number, to: number): Span | null {
  const a = Math.max(ms(span.starts_at), from);
  const b = Math.min(ms(span.ends_at), to);
  return a < b
    ? { starts_at: new Date(a).toISOString(), ends_at: new Date(b).toISOString() }
    : null;
}

const clipAll = (spans: readonly Span[], from: number, to: number): Span[] =>
  spans.flatMap((s) => clip(s, from, to) ?? []);

export function matches(teacher: OverviewTeacher, f: TeacherFilter): boolean {
  return (
    (f.program === 'all' || teacher.programs.includes(f.program)) &&
    (f.gender === 'all' || teacher.gender === f.gender)
  );
}

/** The open and held lessons (closed ones hidden, as on Today), earliest first, trial flag kept. */
function openLessons(lessons: readonly OverviewLesson[]): OverviewLesson[] {
  const open = new Set(visibleLessons(lessons).map((l) => l.id));
  return lessons.filter((l) => open.has(l.id)).sort((a, b) => ms(a.starts_at) - ms(b.starts_at));
}

/** Lessons and free gaps of one day, by start. */
function dayItems(lessons: readonly OverviewLesson[], free: readonly Span[]): AgendaItem[] {
  const items: { at: number; item: AgendaItem }[] = [
    ...lessons.map((lesson) => ({
      at: ms(lesson.starts_at),
      item: { kind: 'lesson' as const, lesson },
    })),
    ...free.map((span) => ({ at: ms(span.starts_at), item: { kind: 'free' as const, span } })),
  ];
  return items.sort((a, b) => a.at - b.at).map((x) => x.item);
}

/** A week's lessons under their Riyadh day; days without lessons are left out. */
function weekItems(lessons: readonly OverviewLesson[]): AgendaItem[] {
  const items: AgendaItem[] = [];
  let last = '';
  for (const lesson of lessons) {
    const date = localDate(new Date(lesson.starts_at), RIYADH_TZ);
    if (date !== last) items.push({ kind: 'day', date });
    last = date;
    items.push({ kind: 'lesson', lesson });
  }
  return items;
}

/** One agenda per matching teacher, by name: the day with its free gaps, or the week by day. */
export function teacherAgendas(o: ScheduleOverview, opts: AgendaOptions): TeacherAgenda[] {
  const days = opts.view === 'day' ? 1 : 7;
  const from = ms(riyadhMidnight(opts.start));
  const to = ms(riyadhMidnight(addDays(opts.start, days)));
  const lessons = openLessons(o.lessons).filter(
    (l) => ms(l.starts_at) >= from && ms(l.starts_at) < to,
  );
  return o.teachers
    .filter((teacher) => matches(teacher, opts.filter))
    .sort((a, b) => a.display_name_ar.localeCompare(b.display_name_ar, 'ar'))
    .map((teacher) => {
      const own = lessons.filter((l) => l.teacher.id === teacher.id);
      return {
        teacher,
        items: days === 1 ? dayItems(own, clipAll(teacher.free, from, to)) : weekItems(own),
        windows: clipAll(teacher.windows, from, to),
        timeOff: teacher.time_off.filter((off) => clip(off, from, to) !== null),
      };
    });
}

/** A row's key inside its teacher's section (lesson ids are unique; days and gaps are per teacher). */
export function itemKey(item: AgendaItem): string {
  if (item.kind === 'lesson') return item.lesson.id;
  return item.kind === 'day' ? `day-${item.date}` : `free-${item.span.starts_at}`;
}

/** Lessons per day of the week starting `start`, for the matching teachers (the day pills). */
export function dayCounts(
  o: ScheduleOverview,
  start: string,
  filter: TeacherFilter,
): { date: string; count: number }[] {
  const shown = new Set(o.teachers.filter((t) => matches(t, filter)).map((t) => t.id));
  const lessons = o.lessons.filter((l) => shown.has(l.teacher.id));
  return agendaDays(lessons, start).map((d) => ({ date: d.date, count: d.lessons.length }));
}
