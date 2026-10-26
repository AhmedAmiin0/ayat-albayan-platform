import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { Attendance, FeedbackKind, LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';

export type FeedbackRow = Tables<'lesson_feedback'>;

export type Answer = Required<Pick<TablesUpdate<'lesson_feedback'>, 'rating' | 'recommend' | 'contact_phone' | 'submitted_at'>> &
  Pick<TablesUpdate<'lesson_feedback'>, 'note'>;

/** What «ابعت طلب الرأي» needs to know about one student on one lesson. */
export interface RequestContext {
  lessonStatus: LessonStatus;
  /** This student's own attendance on the lesson (null until an outcome is recorded). */
  attendance: Attendance | null;
  teacher: { id: string; name: string };
  /** The lesson's rule is the free trial. */
  kind: FeedbackKind;
  student: { id: string; name: string };
  guardian: { id: string; phone: string };
}

/** The public page's view of a row: only these three leave the API. */
export interface PublicContext {
  row: FeedbackRow;
  teacherName: string;
  guardianPhone: string;
}

/** lesson_feedback reads and writes for the request and the public form (service role; callers guard). */
@Injectable()
export class FeedbackQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** null when the lesson does not exist or the student is not on it. */
  async requestContext(lessonId: string, studentId: string): Promise<RequestContext | null> {
    const { data: lesson, error } = await this.db
      .from('lessons')
      .select('status, teacher_id, rule_id')
      .eq('id', lessonId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!lesson) return null;
    const [onLesson, trial, teacher, student] = await Promise.all([
      this.db.from('lesson_students').select('student_id, attendance').match({ lesson_id: lessonId, student_id: studentId }).maybeSingle(),
      this.isTrial(lesson.rule_id),
      this.db.from('teachers').select('id, display_name_ar').eq('id', lesson.teacher_id).maybeSingle(),
      this.db.from('students').select('id, name, guardian_id').eq('id', studentId).maybeSingle(),
    ]);
    for (const r of [onLesson, teacher, student]) if (r.error) throw dbError(r.error);
    if (!onLesson.data || !teacher.data || !student.data) return null;
    const guardian = await this.guardian(student.data.guardian_id);
    if (!guardian) return null;
    return {
      lessonStatus: lesson.status,
      attendance: onLesson.data.attendance,
      teacher: { id: teacher.data.id, name: teacher.data.display_name_ar },
      kind: trial ? 'trial' : 'subscription',
      student: { id: student.data.id, name: student.data.name },
      guardian,
    };
  }

  async find(lessonId: string, studentId: string): Promise<FeedbackRow | null> {
    const { data, error } = await this.db
      .from('lesson_feedback')
      .select('*')
      .match({ lesson_id: lessonId, student_id: studentId })
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * Creates the pending row, or gives an unanswered one a new link (the old hash stops finding its
   * row, which revokes it). null = already answered: an answer is never reset.
   */
  async issue(row: TablesInsert<'lesson_feedback'>): Promise<FeedbackRow | null> {
    const created = await this.db.from('lesson_feedback').insert(row).select('*').single();
    if (!created.error) return created.data;
    if (created.error.code !== '23505') throw dbError(created.error);
    const { lesson_id, student_id, ...link } = row;
    const { data, error } = await this.db
      .from('lesson_feedback')
      .update(link)
      .match({ lesson_id, student_id })
      .is('submitted_at', null)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byTokenHash(hash: string): Promise<PublicContext | null> {
    const { data: row, error } = await this.db.from('lesson_feedback').select('*').eq('token_hash', hash).maybeSingle();
    if (error) throw dbError(error);
    if (!row) return null;
    const [teacher, guardian] = await Promise.all([
      this.db.from('teachers').select('display_name_ar').eq('id', row.teacher_id).maybeSingle(),
      this.guardian(row.guardian_id),
    ]);
    if (teacher.error) throw dbError(teacher.error);
    return { row, teacherName: teacher.data?.display_name_ar ?? '', guardianPhone: guardian?.phone ?? '' };
  }

  /** The one write of an answer: only while unanswered, so a second submit finds nothing (null). */
  async answer(id: string, patch: Answer): Promise<FeedbackRow | null> {
    const { data, error } = await this.db
      .from('lesson_feedback')
      .update(patch)
      .eq('id', id)
      .is('submitted_at', null)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The lesson's rule is the free trial (docs/08 «جلسة تجريبية مجانية»); a lesson without a rule is not. */
  private async isTrial(ruleId: string | null): Promise<boolean> {
    if (!ruleId) return false;
    const { data, error } = await this.db.from('schedule_rules').select('package').eq('id', ruleId).maybeSingle();
    if (error) throw dbError(error);
    return data?.package === 'trial';
  }

  private async guardian(id: string): Promise<{ id: string; phone: string } | null> {
    const { data, error } = await this.db.from('guardians').select('id, phone_e164').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data ? { id: data.id, phone: data.phone_e164 } : null;
  }
}
