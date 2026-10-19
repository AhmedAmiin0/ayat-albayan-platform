import { meetingModeOf, type LessonStatus, type PackageSize, type TeacherMeetingMode } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { Contact } from '../lessons/confirmation-messages';
import { notFound } from '../scheduling/errors';
import { dbError } from '../teachers/http';

/** The subscription a course belongs to (subscriptions row). */
export type CourseSub = {
  id: string;
  student_id: string;
  package: PackageSize | null;
  duration: number;
  lessons_total: number;
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
};

export type OpenCourseLesson = { id: string; status: LessonStatus };

/** An active rule of the student, for courseOverlaps (sales-course.rules.ts). */
type OtherRule = { starts_on: string; ends_on: string | null; package: PackageSize | null; subscription_id: string | null };

/** «تغيير أيام الحلقات»'s reads (service role; ownership is checked by CourseChange). */
@Injectable()
export class CourseChangeQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 404 subscription_not_found. */
  async subscription(id: string): Promise<CourseSub> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, student_id, package, duration, lessons_total, starts_on')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('subscription_not_found');
    return data;
  }

  /** Every rule of the course (any status), the first one first. */
  async rules(subscriptionId: string): Promise<ChangeRule[]> {
    const { data, error } = await this.db
      .from('schedule_rules')
      .select(
        'id, status, teacher_id, tz, byday, start_time_local, duration_min, starts_on, ends_on, first_rule_id, package, meeting_link, created_from_lead_id, schedule_rule_students(student_id, student:students(meeting_link_override))',
      )
      .eq('subscription_id', subscriptionId)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  /** The student's active rules of every other course (another or no subscription_id): course_exists. */
  async others(sub: Pick<CourseSub, 'id' | 'student_id'>): Promise<OtherRule[]> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule:schedule_rules!inner(starts_on, ends_on, package, status, subscription_id)')
      .eq('student_id', sub.student_id)
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    return data.map(({ rule }) => rule).filter((r) => r.subscription_id !== sub.id);
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
