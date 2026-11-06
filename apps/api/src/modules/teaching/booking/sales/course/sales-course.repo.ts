import { DURATIONS, type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';
import type { CourseRuleRow } from '@/modules/teaching/booking/core/course-read';
import type { CourseRule } from './sales-course.rules';

type SubscriptionRow = Omit<CourseSubscription, 'duration'> & { duration: number };

/** lesson_duration is 30 / 45 / 60 / 90 (migration 001); anything else is a broken row. */
function toSubscription(row: SubscriptionRow): CourseSubscription {
  const duration = DURATIONS.find((d) => d === row.duration);
  if (duration === undefined) throw new Error(`subscription ${row.id} has duration ${row.duration}`);
  return { ...row, duration };
}

/** How many unpaid / active packages the course looks through (a family has one or two). */
const SUBSCRIPTIONS_READ = 10;

/** A course rule with its plan; the inner join keeps only the student's own rules. */
const COURSE_RULE_SELECT =
  'id, subscription_id, teacher_id, duration_min, start_time_local, tz, byday, starts_on, ends_on, status, first_rule_id, sub:subscriptions(package, lessons_total, lessons_used_before), teacher:teachers(tz), schedule_rule_students!inner(student_id)' as const;

const pickRule = (r: Omit<CourseRuleRow, 'subscription_id' | 'sub'>): Omit<CourseRuleRow, 'subscription_id' | 'sub'> => ({
  id: r.id,
  teacher_id: r.teacher_id,
  duration_min: r.duration_min,
  start_time_local: r.start_time_local,
  tz: r.tz,
  byday: r.byday,
  starts_on: r.starts_on,
  ends_on: r.ends_on,
  status: r.status,
  first_rule_id: r.first_rule_id,
  teacher: r.teacher,
});

/** The reads of the assistant's course (service role; ownership is checked before). */
@Injectable()
export class SalesCourseRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** What the wizard shows of the student (no guardian, no notes); 404 student_not_found. */
  async student(studentId: string): Promise<SalesCourseView['student']> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, tz, program, teacher_gender_pref, teacher_id')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    return { ...data, code: data.code ?? '' };
  }

  /**
   * The subscription the course books: the newest unpaid or active one, or (owner 2026-11-06: a
   * family with two packages books the older one too) the newest WITHOUT a course of its own. Not
   * for a student with an imported course (a rule with no subscription_id): its old packages were
   * taught on that course and look unbooked. null without any.
   */
  async subscription(studentId: string, only?: string): Promise<CourseSubscription | null> {
    const [all, imported] = await Promise.all([this.openPackages(studentId), this.imported(studentId)]);
    // `only`: that package (a draft booked on its payment, owner 2026-11-06).
    const subs = only === undefined ? all : all.filter((r) => r.id === only);
    const row = (imported ? undefined : subs.find((r) => r.rules.length === 0)) ?? subs[0];
    if (!row) return null;
    const { rules, ...sub } = row;
    return toSubscription(sub);
  }

  private async openPackages(studentId: string) {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, package, duration, lessons_total, lessons_used_before, starts_on, rules:schedule_rules(id)')
      .eq('student_id', studentId)
      .in('status', ['unpaid', 'active'])
      .order('created_at', { ascending: false })
      .limit(SUBSCRIPTIONS_READ);
    if (error) throw dbError(error);
    return data;
  }

  /** Has the student any rule not tied to a package (imported, admin-booked)? */
  private async imported(studentId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule:schedule_rules!inner(id)')
      .eq('student_id', studentId)
      .is('rule.subscription_id', null)
      .limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** The student's active rules (schedule_rule_students → schedule_rules.status = 'active'). */
  async rules(studentId: string): Promise<CourseRule[]> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule:schedule_rules!inner(starts_on, ends_on, package, status)')
      .eq('student_id', studentId)
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    return data.map(({ rule }) => ({ starts_on: rule.starts_on, ends_on: rule.ends_on, package: rule.package }));
  }

  /**
   * Does the subscription already have its course (PR #113 review M3)? Any rule tied to it, whatever
   * its status: one paid plan books exactly one course; a renewal is a new subscription.
   */
  async subscriptionBooked(subscriptionId: string): Promise<boolean> {
    const { data, error } = await this.db.from('schedule_rules').select('id').eq('subscription_id', subscriptionId).limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /**
   * Every rule of the student's assistant courses (subscription_id set, any status) with the plan of
   * its subscription: course-read.ts groups them (the previous course, the running one).
   */
  async courseRules(studentId: string): Promise<CourseRuleRow[]> {
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(COURSE_RULE_SELECT)
      .eq('schedule_rule_students.student_id', studentId)
      .not('subscription_id', 'is', null);
    if (error) throw dbError(error);
    return data.flatMap((r) =>
      r.subscription_id && r.sub ? [{ ...pickRule(r), subscription_id: r.subscription_id, sub: r.sub }] : [],
    );
  }

  /** Did this clientRequestId already book (a retry after a success, review m6)? */
  async requested(requestId: string): Promise<boolean> {
    const { data, error } = await this.db.from('schedule_rules').select('id').eq('client_request_id', requestId).limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }
}
