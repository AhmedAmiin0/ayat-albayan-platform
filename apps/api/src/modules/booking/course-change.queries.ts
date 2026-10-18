import {
  OPEN_LESSON_STATUSES,
  type CourseLessonFact,
  type LessonStatus,
  type PackageSize,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { Contact } from '../lessons/confirmation-messages';
import { notFound } from '../scheduling/errors';
import { readAll } from '../scheduling/read-all';
import { dbError } from '../teachers/http';

/** The subscription a course belongs to (subscriptions row). */
export type CourseSub = {
  id: string;
  student_id: string;
  package: PackageSize | null;
  duration: number;
  lessons_total: number;
};

/** A rule of the course, with what its replacement keeps (link, package, lead, students). */
export type ChangeRule = {
  id: string;
  status: 'active' | 'paused' | 'ended';
  teacher_id: string;
  tz: string;
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

/** «تغيير أيام الحلقات»'s reads (service role; ownership is checked by CourseChange). */
@Injectable()
export class CourseChangeQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 404 subscription_not_found. */
  async subscription(id: string): Promise<CourseSub> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, student_id, package, duration, lessons_total')
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
        'id, status, teacher_id, tz, ends_on, first_rule_id, package, meeting_link, created_from_lead_id, schedule_rule_students(student_id, student:students(meeting_link_override))',
      )
      .eq('subscription_id', subscriptionId)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  /** The student's lessons of these rules starting before `cutoff`: what the course already used. */
  async before(input: {
    ruleIds: readonly string[];
    studentId: string;
    cutoff: Date;
  }): Promise<CourseLessonFact[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, instant, makeup_of_id, lesson_students!inner(student_id, chargeable)')
        .in('rule_id', [...input.ruleIds])
        .eq('lesson_students.student_id', input.studentId)
        .lt('starts_at', input.cutoff.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
    return rows.map((l) => ({
      status: l.status,
      chargeable: l.lesson_students.some((s) => s.chargeable),
      makeup: l.makeup_of_id !== null,
      instant: l.instant,
    }));
  }

  /** The open lessons of these rules from `cutoff` on: they move (rescheduled, chargeable false). */
  async openFrom(
    ruleIds: readonly string[],
    cutoff: Date,
  ): Promise<(OpenCourseLesson & { rule_id: string | null })[]> {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, rule_id')
        .in('rule_id', [...ruleIds])
        .in('status', [...OPEN_LESSON_STATUSES])
        .gte('starts_at', cutoff.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
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
}
