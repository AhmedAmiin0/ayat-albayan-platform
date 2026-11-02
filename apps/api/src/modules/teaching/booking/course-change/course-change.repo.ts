import { meetingModeOf, type LessonStatus, type PackageSize, type TeacherMeetingMode } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { Contact } from '@/modules/teaching/lessons/status/confirmation-messages';
import { notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';

/** The subscription a course belongs to (subscriptions row). */
export type CourseSub = {
  id: string;
  student_id: string;
  package: PackageSize | null;
  duration: number;
  lessons_total: number;
  /** Taken before the platform (owner 2026-10-28): the course carries lessons_total − this. */
  lessons_used_before: number;
  starts_on: string;
};

/** A rule of the course, with what its replacement keeps (link, package, lead, students). */
export type ChangeRule = {
  id: string;
  status: 'active' | 'paused' | 'ended';
  teacher_id: string;
  tz: string;
  byday: number[];
  /** Postgres time "HH:MM:SS". */
  start_time_local: string;
  duration_min: number;
  starts_on: string;
  ends_on: string | null;
  first_rule_id: string | null;
  package: PackageSize | null;
  meeting_link: string | null;
  created_from_lead_id: string | null;
  schedule_rule_students: {
    student_id: string;
    student: { meeting_link_override: string | null } | null;
  }[];
  /** How course_rules_of (migration 991) attributes it; absent = linked by subscription_id. */
  course?: CourseRuleRef;
};

/**
 * course_rules_of: a rule of the course. linked = its subscription_id; else the student's rule inside
 * the package's period, its lessons counting only in [from_on, until_on). clean = false: cannot be
 * attributed (a group, or it runs into the next package).
 */
export interface CourseRuleRef {
  rule_id: string;
  linked: boolean;
  clean: boolean;
  from_on: string | null;
  until_on: string | null;
}

export type OpenCourseLesson = { id: string; status: LessonStatus };

/** An active rule of the student, for courseOverlaps (sales-course.rules.ts). */
type OtherRule = { id: string; starts_on: string; ends_on: string | null; package: PackageSize | null; subscription_id: string | null };

/** «تغيير أيام الحلقات»'s reads (service role; ownership is checked by CourseChange). */
@Injectable()
export class CourseChangeRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 404 subscription_not_found. */
  async subscription(id: string): Promise<CourseSub> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, student_id, package, duration, lessons_total, lessons_used_before, starts_on')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('subscription_not_found');
    return data;
  }

  /**
   * Every rule of the course (any status), the first one first: course_rules_of (migration 991), so
   * a student's imported, handed-over or admin-booked rule (no subscription_id) counts too.
   */
  async rules(subscriptionId: string): Promise<ChangeRule[]> {
    const refs = await this.course(subscriptionId);
    if (refs.length === 0) return [];
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(
        'id, status, teacher_id, tz, byday, start_time_local, duration_min, starts_on, ends_on, first_rule_id, package, meeting_link, created_from_lead_id, schedule_rule_students(student_id, student:students(meeting_link_override))',
      )
      .in('id', refs.map((r) => r.rule_id))
      .order('created_at');
    if (error) throw dbError(error);
    const by = new Map(refs.map((r) => [r.rule_id, r]));
    return data.map((r) => ({ ...r, course: by.get(r.id) }));
  }

  /** course_rules_of: how each rule of the course is attributed. */
  async course(subscriptionId: string): Promise<CourseRuleRef[]> {
    const { data, error } = await this.db.rpc('course_rules_of', { p_subscription: subscriptionId });
    if (error) throw dbError(error);
    return data;
  }

  /**
   * The student's active rules of every other course (another or no subscription_id, not one of
   * `own`: the course's own rules, course_rules_of): course_exists.
   */
  async others(
    sub: Pick<CourseSub, 'id' | 'student_id'>,
    own: readonly string[],
  ): Promise<OtherRule[]> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule:schedule_rules!inner(id, starts_on, ends_on, package, status, subscription_id)')
      .eq('student_id', sub.student_id)
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    const mine = new Set(own);
    return data
      .map(({ rule }) => rule)
      .filter((r) => r.subscription_id !== sub.id && !mine.has(r.id));
  }

  /** Each student's name + guardian, for the queued confirmation (as LessonsQueries.contacts). */
  async contacts(studentIds: readonly string[]): Promise<Contact[]> {
    const { data, error } = await this.db
      .from('students')
      .select('id, name, guardian:guardians(id, phone_e164, tz)')
      .in('id', [...studentIds]);
    if (error) throw dbError(error);
    return data;
  }

  /** The course teacher's own link (the lessons' when the rule and students have none). */
  async teacherLink(teacherId: string): Promise<string | null> {
    const { data, error } = await this.db.from('teachers').select('meeting_link').eq('id', teacherId).maybeSingle();
    if (error) throw dbError(error);
    return data?.meeting_link ?? null;
  }

  /** The course teacher's teachers.meeting_mode (migration 490): null = the academy default. */
  async teacherMode(teacherId: string): Promise<TeacherMeetingMode | null> {
    const { data, error } = await this.db.from('teachers').select('meeting_mode').eq('id', teacherId).maybeSingle();
    if (error) throw dbError(error);
    return meetingModeOf(data?.meeting_mode);
  }
}
