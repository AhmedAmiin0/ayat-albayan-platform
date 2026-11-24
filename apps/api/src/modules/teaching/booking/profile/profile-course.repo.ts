import { currentPackage, OPEN_LESSON_STATUSES, type LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { DB, type Db } from '@/common/db/db.module';
import { notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';

interface PickedTeacher {
  id: string;
  status: 'active' | 'inactive';
  display_name_ar: string;
}

interface Assign {
  studentId: string;
  from: string | null;
  to: string;
  actorId: string;
  subscriptionId: string;
}

/**
 * The profile course actions' reads and the teacher assignment (service role; the routes guard).
 */
@Injectable()
export class ProfileCourseRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** 404 student_not_found; the student's assigned teacher (students.teacher_id). */
  async studentTeacher(studentId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('students')
      .select('teacher_id')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    return data.teacher_id;
  }

  /** The student's current package id (currentPackage); 404 subscription_not_found when none. */
  async currentSubscription(studentId: string): Promise<string> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, status')
      .eq('student_id', studentId)
      .order('starts_on', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw dbError(error);
    const current = currentPackage(data);
    if (!current) throw notFound('subscription_not_found');
    return current.id;
  }

  /** Null when unknown. */
  async teacher(id: string): Promise<PickedTeacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, status, display_name_ar')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** course_rules_of (migration 991) also covers a rule without subscription_id. */
  async upcoming(
    ruleIds: readonly string[],
    limit = 1,
  ): Promise<{ id: string; status: LessonStatus; starts_at: string }[]> {
    if (ruleIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lessons')
      .select('id, status, starts_at')
      .in('rule_id', [...ruleIds])
      .in('status', [...OPEN_LESSON_STATUSES])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(limit);
    if (error) throw dbError(error);
    return data;
  }

  /**
   * students.teacher_id → the new teacher, compare-and-set on the one read (the family channel
   * follows it, channel_teacher_ids); audited only when it changed a row (a retry writes nothing,
   * rule 8).
   */
  async assignTeacher(a: Assign): Promise<boolean> {
    let q = this.db.from('students').update({ teacher_id: a.to }).eq('id', a.studentId);
    q = a.from === null ? q.is('teacher_id', null) : q.eq('teacher_id', a.from);
    const { data, error } = await q.select('id').maybeSingle();
    if (error) throw dbError(error);
    if (!data) return false;
    await this.audit.record({
      actorId: a.actorId,
      entity: 'students',
      entityId: a.studentId,
      action: 'teacher_change',
      before: { teacher_id: a.from },
      after: { teacher_id: a.to, subscription_id: a.subscriptionId },
    });
    return true;
  }
}
