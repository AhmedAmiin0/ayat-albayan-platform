import type { Gender, LessonView, OverviewTeacher, OverviewTimeOff, Program } from '@ab/shared';
import type { ScheduleOverview, Span } from '@ab/shared';
import { localDate, visibleLessons } from '@/today/lib/timeline';
import { agendaDays } from '../agenda/agenda';
import { addDays, zonedMidnight } from '../lib/week';
import { clip, clipAll, freeAhead, joined } from './spans';

// «الجدول» for every teacher (R-SCH-01, R-TCH-02): the overview cut to one day of the viewer's
// calendar (docs/34) or the whole week, filtered by program and gender. Rows come from the
// teachers, so a teacher with nothing booked still shows. Windows and free time are the API's;
// here they are only clipped (spans.ts).

export type ScheduleView = 'day' | 'week';

export interface TeacherFilter {
  program: Program | 'all';
  gender: Gender | 'all';
}

export type AgendaItem =
  | { kind: 'lesson'; lesson: LessonView }
  | { kind: 'free'; span: Span }
  /** Week view: the viewer's day the next lessons fall on. */
  | { kind: 'day'; date: string };

export interface TeacherAgenda {
  teacher: OverviewTeacher;
  items: AgendaItem[];
  /** Availability inside the period (the day view's «متاح» line). */
  windows: Span[];
  timeOff: OverviewTimeOff[];
}

interface AgendaOptions {
  /** First day shown (YYYY-MM-DD) on the viewer's calendar `tz`. */
  start: string;
  /** The viewer's zone: the period runs from its midnight, lessons sit under its days. */
  tz: string;
  view: ScheduleView;
  filter: TeacherFilter;
  /** Free gaps start no earlier than this, rounded up to a quarter hour, as on the web board. */
  now?: Date;
}

const ms = (iso: string) => Date.parse(iso);

export function matches(teacher: OverviewTeacher, f: TeacherFilter): boolean {
  return (
    (f.program === 'all' || teacher.programs.includes(f.program)) &&
    (f.gender === 'all' || teacher.gender === f.gender)
  );
}

/** The open and held lessons (closed ones hidden, as on Today), earliest first, trial flag kept. */
function openLessons(lessons: readonly LessonView[]): LessonView[] {
  const open = new Set(visibleLessons(lessons).map((l) => l.id));
  return lessons.filter((l) => open.has(l.id)).sort((a, b) => ms(a.starts_at) - ms(b.starts_at));
}

/** Lessons and free gaps of one day, by start. */
function dayItems(lessons: readonly LessonView[], free: readonly Span[]): AgendaItem[] {
  const items: { at: number; item: AgendaItem }[] = [
    ...lessons.map((lesson) => ({
      at: ms(lesson.starts_at),
      item: { kind: 'lesson' as const, lesson },
    })),
    ...free.map((span) => ({ at: ms(span.starts_at), item: { kind: 'free' as const, span } })),
  ];
  return items.sort((a, b) => a.at - b.at).map((x) => x.item);
}

/** A week's lessons under the viewer's day (`tz`); days without lessons are left out. */
function weekItems(lessons: readonly LessonView[], tz: string): AgendaItem[] {
  const items: AgendaItem[] = [];
  let last = '';
  for (const lesson of lessons) {
    const date = localDate(new Date(lesson.starts_at), tz);
    if (date !== last) items.push({ kind: 'day', date });
    last = date;
    items.push({ kind: 'lesson', lesson });
  }
  return items;
}

/** One agenda per matching teacher, by name: the day with its free gaps, or the week by day. */
export function teacherAgendas(o: ScheduleOverview, opts: AgendaOptions): TeacherAgenda[] {
  const days = opts.view === 'day' ? 1 : 7;
  const from = ms(zonedMidnight(opts.start, opts.tz));
  const to = ms(zonedMidnight(addDays(opts.start, days), opts.tz));
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
        items:
          days === 1
            ? dayItems(own, freeAhead(teacher.free, { from, to, now: opts.now }))
            : weekItems(own, opts.tz),
        windows: joined(clipAll(teacher.windows, from, to)),
        timeOff: teacher.time_off.filter((off) => clip(off, from, to) !== null),
      };
    });
}

/** A row's key inside its teacher's section (lesson ids are unique; days and gaps are per teacher). */
export function itemKey(item: AgendaItem): string {
  if (item.kind === 'lesson') return item.lesson.id;
  return item.kind === 'day' ? `day-${item.date}` : `free-${item.span.starts_at}`;
}

/** Lessons per viewer's day of the week starting `start`, for the matching teachers (day pills). */
export function dayCounts(
  o: ScheduleOverview,
  week: { start: string; tz: string },
  filter: TeacherFilter,
): { date: string; count: number }[] {
  const shown = new Set(o.teachers.filter((t) => matches(t, filter)).map((t) => t.id));
  const lessons = o.lessons.filter((l) => shown.has(l.teacher.id));
  const days = agendaDays(lessons, week.start, week.tz);
  return days.map((d) => ({ date: d.date, count: d.lessons.length }));
}
