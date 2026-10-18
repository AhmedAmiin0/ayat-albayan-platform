import {
  courseDaysPerWeek,
  DURATIONS,
  type BookedCourse,
  type DayTime,
  type PackageSize,
} from '@ab/shared';

// The assistant's booked courses of a student (owner 2026-10-18): the rules sharing a subscription_id
// (migration 470), read for «تابِع بنفس الأيام» (the previous course) and «تغيير أيام الحلقات» (the
// running one). Pure; local dates "YYYY-MM-DD" compare as strings.

/** One schedule_rules row of a course, with its subscription's plan. */
export type CourseRuleRow = {
  id: string;
  subscription_id: string;
  teacher_id: string;
  duration_min: number;
  /** Postgres time "HH:MM:SS". */
  start_time_local: string;
  tz: string;
  byday: number[];
  starts_on: string;
  ends_on: string | null;
  status: 'active' | 'paused' | 'ended';
  first_rule_id: string | null;
  sub: { package: PackageSize | null; lessons_total: number };
};

const hhmm = (time: string) => time.slice(0, 5);

/**
 * A course from its rules: the latest set (the rules ending on its last day; a rescheduled or
 * changed rule ended earlier), led by the first one (no first_rule_id). null without a capped rule.
 */
export function bookedCourse(rows: readonly CourseRuleRow[]): BookedCourse | null {
  const ends = rows.map((r) => r.ends_on).filter((d): d is string => d !== null);
  const endsOn = ends.sort().at(-1);
  if (!endsOn) return null;
  const latest = rows.filter((r) => r.ends_on === endsOn);
  const head = latest.find((r) => r.first_rule_id === null) ?? latest[0];
  if (!head) return null;
  const durationMin = DURATIONS.find((d) => d === head.duration_min);
  if (durationMin === undefined)
    throw new Error(`rule ${head.id} has duration ${head.duration_min}`);
  const days: DayTime[] = latest
    .flatMap((r) =>
      r.byday.map((weekday) => ({ weekday, startTimeLocal: hhmm(r.start_time_local) })),
    )
    .sort((a, b) => a.weekday - b.weekday);
  return {
    subscriptionId: head.subscription_id,
    teacherId: head.teacher_id,
    durationMin,
    tz: head.tz,
    endsOn,
    days,
    lessonsTotal: head.sub.lessons_total,
    perWeek: courseDaysPerWeek({
      package: head.sub.package,
      lessons_total: head.sub.lessons_total,
    }),
  };
}

/** The student's courses, the latest-ending first. */
export function studentCourses(rows: readonly CourseRuleRow[]): BookedCourse[] {
  const bySub = new Map<string, CourseRuleRow[]>();
  for (const r of rows) bySub.set(r.subscription_id, [...(bySub.get(r.subscription_id) ?? []), r]);
  return [...bySub.values()]
    .map(bookedCourse)
    .filter((c): c is BookedCourse => c !== null)
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn));
}

/** Still running: an active rule of the course ending today or later. */
export const isRunning = (
  rows: readonly CourseRuleRow[],
  c: BookedCourse,
  today: string,
): boolean =>
  rows.some(
    (r) =>
      r.subscription_id === c.subscriptionId &&
      r.status === 'active' &&
      (r.ends_on ?? today) >= today,
  );

export type CourseFactsInput = {
  rows: readonly CourseRuleRow[];
  today: string;
  /** The newest unpaid / active subscription (the one the wizard books), if any. */
  subscriptionId: string | null;
  /** That subscription already has its course. */
  booked: boolean;
};

/**
 * SalesCourseView.previous: the latest course of another subscription while the newest one has no
 * course yet (a renewal). SalesCourseView.current: the latest course still running.
 */
export function courseFacts(input: CourseFactsInput): {
  previous: BookedCourse | null;
  current: BookedCourse | null;
} {
  const courses = studentCourses(input.rows);
  const previous =
    input.subscriptionId && !input.booked
      ? (courses.find((c) => c.subscriptionId !== input.subscriptionId) ?? null)
      : null;
  const current = courses.find((c) => isRunning(input.rows, c, input.today)) ?? null;
  return { previous, current };
}
