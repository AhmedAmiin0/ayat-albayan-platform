import { SCHEDULE_DAYS, SCHEDULE_LIMIT, type SalesStudentLesson, type SalesStudentSchedule } from '@ab/shared';
import { DAY } from '../../../people/teachers';
import { type SalesScheduleRow, toScheduleLesson, toWeeklySlot, type WeeklyRuleRow, withMine } from '../../sales';

// Whitelists: a rule's link or subscription and a lesson's link never reach sales (migration 187).

/** «الحلقات القادمة»: from now, SCHEDULE_DAYS ahead, at most SCHEDULE_LIMIT lessons. */
export function scheduleWindow(now: Date): { from: Date; to: Date; limit: number } {
  return { from: now, to: new Date(now.getTime() + SCHEDULE_DAYS * DAY), limit: SCHEDULE_LIMIT };
}

/** The sales schedule's lesson (trial / makeup badges, `mine` on her students) without the way in. */
function toStudentLesson(row: SalesScheduleRow, own: ReadonlySet<string>): SalesStudentLesson {
  const l = toScheduleLesson(row, false);
  const lesson = { id: l.id, starts_at: l.starts_at, ends_at: l.ends_at, status: l.status, trial: l.trial, makeup: l.makeup };
  return withMine({ ...lesson, teacher: l.teacher, students: l.students }, own);
}

interface ScheduleParts {
  rules: readonly WeeklyRuleRow[];
  lessons: readonly SalesScheduleRow[];
  /** Her students (SalesOwnership.studentIds). */
  own: readonly string[];
  /** The student's own zone (students.tz). */
  studentTz: string;
}

/** «الجدول»: weekly slots by their next start, then the upcoming lessons by start. */
export function toStudentSchedule(p: ScheduleParts, now: Date): SalesStudentSchedule {
  const weekly = p.rules.flatMap((r) => toWeeklySlot(r, now) ?? []);
  weekly.sort((a, b) => (a.next[0] ?? '').localeCompare(b.next[0] ?? ''));
  const own = new Set(p.own);
  const upcoming = [...p.lessons].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).slice(0, SCHEDULE_LIMIT);
  return { student_tz: p.studentTz, weekly, upcoming: upcoming.map((row) => toStudentLesson(row, own)) };
}
