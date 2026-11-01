import { OCCUPYING_LESSON_STATUSES, type LessonView, type OverviewTeacher, type ScheduleOverview, type Span } from '@ab/shared';
import type { Interval } from '@/modules/people/teachers/availability/intervals';
import type { LessonWindow } from '@/modules/teaching/lessons/lessons.repo';
import { teacherSpans } from './free-windows';
import type { OverviewCarryRow, OverviewSlotRow, OverviewTeacherRow, OverviewTimeOffRow } from './overview.repo';

export type OverviewParts = {
  window: LessonWindow;
  teachers: readonly OverviewTeacherRow[];
  slots: readonly OverviewSlotRow[];
  timeOff: readonly OverviewTimeOffRow[];
  /** Lessons that started before the window and run into it: they block free time only. */
  carry: readonly OverviewCarryRow[];
  /** teacher id → students with status trial | active (TeachersQueries.loads). */
  loads: ReadonlyMap<string, number>;
  /** The window's lessons, every status, by starts_at. */
  lessons: readonly LessonView[];
};

const OCCUPYING: ReadonlySet<string> = new Set(OCCUPYING_LESSON_STATUSES);
const iso = (value: string | number): string => new Date(value).toISOString();
const toSpan = (i: Interval): Span => ({ starts_at: iso(i.start), ends_at: iso(i.end) });
const range = (r: { starts_at: string; ends_at: string }) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) });

function byTeacher<T extends { teacher_id: string }>(rows: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(r.teacher_id, [...(out.get(r.teacher_id) ?? []), r]);
  return out;
}

/**
 * GET /lessons/overview (R-SCH-09): active teachers plus any inactive one with a lesson in the
 * window (so leftover lessons still have a row), by Arabic name, each with load, windows, time off
 * and free spans; lessons stay one flat list by starts_at.
 */
export function toOverview(p: OverviewParts): ScheduleOverview {
  const slots = byTeacher(p.slots);
  const timeOff = byTeacher(p.timeOff);
  const carry = byTeacher(p.carry);
  const lessons = byTeacher(p.lessons.map((l) => ({ ...l, teacher_id: l.teacher.id })));
  const teachers = p.teachers
    .filter((t) => t.status === 'active' || lessons.has(t.id))
    .map((t): OverviewTeacher => {
      const off = timeOff.get(t.id) ?? [];
      const busy = [...(carry.get(t.id) ?? []), ...(lessons.get(t.id) ?? [])].filter((l) => OCCUPYING.has(l.status)).map(range);
      const spans = teacherSpans({ ...p.window, weekly: slots.get(t.id) ?? [], timeOff: off.map(range), busy });
      return {
        ...t,
        students_count: p.loads.get(t.id) ?? 0,
        windows: spans.windows.map(toSpan),
        time_off: off.map((o) => ({ id: o.id, reason: o.reason, starts_at: iso(o.starts_at), ends_at: iso(o.ends_at) })),
        free: spans.free.map(toSpan),
      };
    })
    .sort((a, b) => a.display_name_ar.localeCompare(b.display_name_ar, 'ar') || a.id.localeCompare(b.id));
  return {
    from: p.window.from.toISOString(),
    to: p.window.to.toISOString(),
    teachers,
    lessons: [...p.lessons].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
  };
}
