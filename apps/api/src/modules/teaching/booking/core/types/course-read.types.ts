import type { PackageSize } from '@ab/catalog';

/** One schedule_rules row of a course, with its subscription's plan. */
export interface CourseRuleRow {
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
  sub: { package: PackageSize | null; lessons_total: number; lessons_used_before?: number };
  /** The course teacher's zone. */
  teacher: { tz: string } | null;
}

export interface CourseFactsInput {
  rows: readonly CourseRuleRow[];
  now: Date;
  /** The newest unpaid / active subscription (the one the wizard books), if any. */
  subscriptionId: string | null;
  /** That subscription already has its course. */
  booked: boolean;
}
