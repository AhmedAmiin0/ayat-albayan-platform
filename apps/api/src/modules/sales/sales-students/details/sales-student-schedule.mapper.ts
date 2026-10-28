import { SCHEDULE_DAYS, SCHEDULE_LIMIT, type SalesStudentLesson, type SalesStudentSchedule, type SalesWeeklySlot } from '@ab/shared';
import { DAY, localDay, toMinutes, weekdayOf, zonedToUtc } from '../../../people/teachers';
import { type SalesScheduleRow, toScheduleLesson, withMine } from '../../sales';
import type { WeeklyRuleRow } from './sales-student.queries';

// Whitelists: a rule's link or subscription and a lesson's link never reach sales (migration 187).

/** «الحلقات القادمة»: from now, SCHEDULE_DAYS ahead, at most SCHEDULE_LIMIT lessons. */
export function scheduleWindow(now: Date): { from: Date; to: Date; limit: number } {
  return { from: now, to: new Date(now.getTime() + SCHEDULE_DAYS * DAY), limit: SCHEDULE_LIMIT };
}

const utcDay = (date: string): number => Date.parse(`${date}T00:00:00Z`);

/**
 * The next start of each of the rule's weekdays after `now` (not before its starts_on, not after its
 * ends_on), as UTC instants by time. Read in the rule's zone, so DST moves the instant, not the wall clock.
 */
export function nextStarts(rule: Pick<WeeklyRuleRow, 'byday' | 'start_time_local' | 'tz' | 'starts_on' | 'ends_on'>, now: Date): string[] {
  const from = Math.max(localDay(now.getTime(), rule.tz), utcDay(rule.starts_on));
  const last = rule.ends_on ? utcDay(rule.ends_on) : Infinity;
  const minutes = toMinutes(rule.start_time_local);
  const seen = new Set<number>();
  const out: number[] = [];
  for (let day = from; day <= from + 7 * DAY && day <= last; day += DAY) {
    const weekday = weekdayOf(day);
    if (!rule.byday.includes(weekday) || seen.has(weekday)) continue;
    const at = zonedToUtc(day, minutes, rule.tz);
    if (at <= now.getTime()) continue;
    seen.add(weekday);
    out.push(at);
  }
  return out.sort((a, b) => a - b).map((at) => new Date(at).toISOString());
}

/** An active weekly rule still to come; a trial's one-lesson rule and a finished course are left out. */
function toWeeklySlot(rule: WeeklyRuleRow, now: Date): SalesWeeklySlot | null {
  if (rule.package === 'trial') return null;
  const next = nextStarts(rule, now);
  if (next.length === 0) return null;
  return {
    rule_id: rule.id,
    byday: [...rule.byday].sort((a, b) => a - b),
    start_time_local: rule.start_time_local.slice(0, 5),
    tz: rule.tz,
    duration_min: rule.duration_min,
    teacher: rule.teacher ? { display_name_ar: rule.teacher.display_name_ar, display_name_en: rule.teacher.display_name_en } : null,
    next,
  };
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
