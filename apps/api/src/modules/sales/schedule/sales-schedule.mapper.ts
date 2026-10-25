import { isOpenLesson, RIYADH_TZ, type SalesScheduleLesson } from '@ab/shared';
import { DAY, localDay, zonedToUtc } from '../../teachers/availability/zoned-time';
import type { SalesScheduleRow, UpcomingRow } from './sales-schedule.queries';

// Whitelists, not omit-lists: a column added to lessons later never reaches sales.

/** «الحلقة القادمة» looks this far ahead (weekly lessons: everyone booked has one inside it). */
export const UPCOMING_DAYS = 8;

/** Not counted in «حلقات اليوم»: cancelled ones (a moved-away one is never read). */
const CANCELLED = new Set(['cancelled_by_teacher', 'cancelled_by_admin']);

/** Today's Riyadh calendar day, "YYYY-MM-DD". */
export function riyadhToday(now: Date): string {
  return new Date(localDay(now.getTime(), RIYADH_TZ)).toISOString().slice(0, 10);
}

/** The UTC instants bounding a Riyadh day "YYYY-MM-DD": [00:00, 24:00). */
export function riyadhDayRange(date: string): { from: Date; to: Date } {
  const day = Date.parse(`${date}T00:00:00Z`);
  return { from: new Date(zonedToUtc(day, 0, RIYADH_TZ)), to: new Date(zonedToUtc(day, 1440, RIYADH_TZ)) };
}

/** From now to UPCOMING_DAYS ahead. */
export function upcomingRange(now: Date): { from: Date; to: Date } {
  return { from: now, to: new Date(now.getTime() + UPCOMING_DAYS * DAY) };
}

export function toScheduleLesson(row: SalesScheduleRow): SalesScheduleLesson {
  const teacher = row.teacher;
  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    trial: row.rule?.package === 'trial',
    makeup: row.makeup_of_id !== null,
    teacher: { id: teacher?.id ?? '', display_name_ar: teacher?.display_name_ar ?? '', display_name_en: teacher?.display_name_en ?? null },
    students: row.lesson_students.flatMap(({ student: s }) => (s ? [{ id: s.id, code: s.code ?? '', name: s.name }] : [])),
  };
}

export interface TeacherDayFacts {
  lessons_today: number;
  live_now: boolean;
}

/** Per teacher id: today's lessons (not cancelled) and whether one of them is running now. */
export function teacherDayFacts(rows: readonly SalesScheduleRow[], now: Date): Map<string, TeacherDayFacts> {
  const facts = new Map<string, TeacherDayFacts>();
  const at = now.getTime();
  for (const row of rows) {
    const id = row.teacher?.id;
    if (!id || CANCELLED.has(row.status)) continue;
    const running = isOpenLesson(row.status) && Date.parse(row.starts_at) <= at && at < Date.parse(row.ends_at);
    const prev = facts.get(id) ?? { lessons_today: 0, live_now: false };
    facts.set(id, { lessons_today: prev.lessons_today + 1, live_now: prev.live_now || running });
  }
  return facts;
}

/** Per student id: the start of their first upcoming open lesson (rows come by start). */
export function nextLessons(rows: readonly UpcomingRow[]): Map<string, string> {
  const next = new Map<string, string>();
  for (const row of rows) {
    for (const { student_id } of row.lesson_students) if (!next.has(student_id)) next.set(student_id, row.starts_at);
  }
  return next;
}
