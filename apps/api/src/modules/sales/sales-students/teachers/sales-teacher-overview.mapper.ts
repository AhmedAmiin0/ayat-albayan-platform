import {
  RIYADH_TZ,
  teacherLessonTotals,
  wallParts,
  type SalesOverviewStudent,
  type SalesTeacherOverview,
  type SalesTeacherSlot,
} from '@ab/shared';
import { DAY } from '../../../people/teachers';
import { nextStarts } from '@/modules/sales/sales';
import type { TeacherLessonRow, TeacherRuleRow } from './sales-teacher-overview.queries';

/** «الحضور» covers the last 30 days and lists the latest 20 lessons. */
const OVERVIEW_DAYS = 30;
const LATEST = 20;

export const overviewWindow = (now: Date): { from: Date; to: Date } => ({ from: new Date(now.getTime() - OVERVIEW_DAYS * DAY), to: now });

const namesOf = (rows: TeacherLessonRow['lesson_students']): SalesOverviewStudent[] =>
  rows.flatMap((r) => (r.student ? [{ name: r.student.name, code: r.student.code ?? '' }] : []));

/**
 * One row per weekday of a weekly rule from its next start (DST-safe); a trial's one-lesson rule is
 * left out. weekday/time stay Riyadh's for old clients; `at` lets the viewer's zone apply (docs/34).
 */
function slotsOf(rule: TeacherRuleRow, now: Date): SalesTeacherSlot[] {
  if (rule.package === 'trial') return [];
  const students = namesOf(rule.students);
  return nextStarts(rule, now).map((at) => {
    const wall = wallParts(at, RIYADH_TZ);
    return { rule_id: rule.id, weekday: wall.weekday, time: wall.time, at, duration_min: rule.duration_min, students };
  });
}

/** Whitelist of GET /sales/teachers/:id/overview: names, codes, times and statuses; never money or a link. */
export function toTeacherOverview(p: { rules: readonly TeacherRuleRow[]; lessons: readonly TeacherLessonRow[] }, now: Date): SalesTeacherOverview {
  const weekly = p.rules.flatMap((r) => slotsOf(r, now));
  weekly.sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
  const past = p.lessons.filter((l) => l.status !== 'rescheduled' && Date.parse(l.starts_at) < now.getTime());
  past.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  return {
    weekly,
    attendance: {
      days: OVERVIEW_DAYS,
      totals: teacherLessonTotals(past.map((l) => l.status)),
      latest: past.slice(0, LATEST).map((l) => ({
        lesson_id: l.id,
        starts_at: new Date(l.starts_at).toISOString(),
        status: l.status,
        students: namesOf(l.lesson_students),
      })),
    },
  };
}
