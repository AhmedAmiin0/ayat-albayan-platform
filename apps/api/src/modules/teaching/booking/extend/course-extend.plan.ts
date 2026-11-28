import { courseRemaining, type CourseLessonFact } from '@ab/shared';
import { DURATIONS } from '@ab/catalog';
import { localDateOf, wallParts } from '@ab/schedule';
import { addDays } from '@ab/time';
import { plannedCourseStarts } from '@/modules/teaching/booking/core/booking.course-end';
import type { SeriesRule } from '@/modules/teaching/booking/plan/booking.series-plan';

// Pure: undated lessons go after the planned end on the course's own days and times.

/** A rule of the course (schedule_rules), as CourseChangeRepo.rules reads it. */
export interface ExtendRuleRow {
  id: string;
  status: 'active' | 'paused' | 'ended';
  tz: string;
  byday: number[];
  /** Postgres time "HH:MM:SS". */
  start_time_local: string;
  duration_min: number;
  ends_on: string | null;
}

interface ExtendFacts {
  rules: readonly ExtendRuleRow[];
  /** The lessons the course books (courseLessonCount). */
  lessonsTotal: number;
  /** Every lesson of the course: those that count take a place (courseRemaining). */
  lessons: readonly CourseLessonFact[];
  now: Date;
}

export interface ExtendPlan {
  /** The rules of the latest set: they get the new ends_on. */
  ruleIds: string[];
  tz: string;
  /** The course's planned last day before the extension. */
  courseEnd: string;
  /** The lessons booked, earliest first (empty = nothing left without a date). */
  starts: Date[];
  /** The new last day; null when nothing is booked. */
  endsOn: string | null;
  /** An open pause means nothing may be booked now. */
  paused: boolean;
}

const hhmm = (time: string): string => time.slice(0, 5);
const later = (a: string, b: string): string => (a > b ? a : b);

/**
 * The latest set: the rules that end on the course's last day (a rule a change replaced ended
 * earlier; the daily job may have ended these once that day passed).
 */
function latestSet(rules: readonly ExtendRuleRow[]): ExtendRuleRow[] {
  const capped = rules.filter((r) => r.ends_on !== null);
  const end = capped
    .map((r) => r.ends_on ?? '')
    .sort()
    .at(-1);
  return capped.filter((r) => r.ends_on === end);
}

/** One series of the set's days and times from `startsOn`. null = an unknown lesson length. */
function seriesOf(set: readonly ExtendRuleRow[], startsOn: string): SeriesRule | null {
  const [head] = set;
  const durationMin = DURATIONS.find((d) => d === head?.duration_min);
  if (!head || durationMin === undefined) return null;
  const dayTimes = set.flatMap((r) =>
    r.byday.map((weekday) => ({ weekday, startTimeLocal: hhmm(r.start_time_local) })),
  );
  const byday = dayTimes.map((d) => d.weekday).sort((a, b) => a - b);
  const time = hhmm(head.start_time_local);
  const tz = head.tz;
  return { byday, dayTimes, startTimeLocal: time, tz, durationMin, startsOn, single: false };
}

/** The lessons booked from the series and the new last day (null when nothing is booked). */
function booked(rule: SeriesRule, facts: ExtendFacts): Pick<ExtendPlan, 'starts' | 'endsOn'> {
  const left = Math.max(0, courseRemaining(facts.lessonsTotal, facts.lessons));
  const starts = plannedCourseStarts({ rule, now: facts.now, lessonsTotal: left });
  const last = starts.at(-1);
  return { starts, endsOn: last ? localDateOf(last, rule.tz) : null };
}

/**
 * The extension of a course: courseRemaining lessons (the balance views' rule) on the latest
 * set's days from the day after its end (or today, when later). null without a capped rule.
 */
export function planExtend(facts: ExtendFacts): ExtendPlan | null {
  const set = latestSet(facts.rules);
  const head = set[0];
  if (!head?.ends_on) return null;
  const courseEnd = head.ends_on;
  const today = wallParts(facts.now.toISOString(), head.tz).date;
  const rule = seriesOf(set, later(addDays(courseEnd, 1), today));
  if (!rule) return null;
  const paused = set.some((r) => r.status === 'paused');
  return { ruleIds: set.map((r) => r.id), tz: head.tz, courseEnd, ...booked(rule, facts), paused };
}
