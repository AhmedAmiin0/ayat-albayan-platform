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
  /** The course teacher's zone. */
  teacher: { tz: string } | null;
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
    teacherTz: head.teacher?.tz ?? head.tz,
    durationMin,
    tz: head.tz,
    startsOn: latest.map((r) => r.starts_on).sort()[0] ?? head.starts_on,
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

const activeOf = (rows: readonly CourseRuleRow[], c: BookedCourse) =>
  rows.filter((r) => r.subscription_id === c.subscriptionId && r.status === 'active');

/** Its active rules cover today: starts_on ≤ today and ends_on null or ≥ today. */
export const coversToday = (rows: readonly CourseRuleRow[], c: BookedCourse, today: string): boolean =>
  activeOf(rows, c).some((r) => r.starts_on <= today && (r.ends_on ?? today) >= today);

/** The first day of its active rules starting after today (a course booked ahead), or null. */
const upcomingFrom = (rows: readonly CourseRuleRow[], c: BookedCourse, today: string): string | null =>
  activeOf(rows, c).map((r) => r.starts_on).filter((d) => d > today).sort()[0] ?? null;

/**
 * The course «تغيير أيام الحلقات» changes: the one running today, else the earliest-starting upcoming
 * one (a renewal booked ahead never hides the course actually running). null without either.
 */
export function currentCourse(rows: readonly CourseRuleRow[], courses: readonly BookedCourse[], today: string): BookedCourse | null {
  const running = courses.find((c) => coversToday(rows, c, today));
  if (running) return running;
  const ahead = courses
    .map((c) => ({ c, from: upcomingFrom(rows, c, today) }))
    .filter((x): x is { c: BookedCourse; from: string } => x.from !== null)
    .sort((a, b) => a.from.localeCompare(b.from));
  return ahead[0]?.c ?? null;
}

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
 * course yet (a renewal). SalesCourseView.current: currentCourse.
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
  const current = currentCourse(input.rows, courses, input.today);
  return { previous, current };
}
