import type { Gender, Program, StudentStatus, TrialDateResult } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Json } from '@ab/db';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { domainError } from './booking.errors';
import type { TrialPick } from './trial-date.plan';
import type { TrialLessonRead } from './trial-date.history';

const LESSON =
  'id, rule_id, teacher_id, starts_at, ends_at, status, created_at, created_by, rescheduled_from_id, instant, makeup_of_id, teacher:teachers(id, display_name_ar, display_name_en)';
const PLATFORM = `student_id, attendance, chargeable, lesson:lessons!inner(${LESSON}, rule:schedule_rules!lessons_rule_id_fkey!inner(package))`;
const IMPORTED = `student_id, attendance, chargeable, lesson:lessons!inner(${LESSON}, rule:schedule_rules!lessons_rule_id_fkey(package))`;

export type TrialStudent = {
  id: string;
  status: StudentStatus;
  tz: string;
  program?: Program;
  teacher_gender_pref?: Gender | null;
  guardian: { tz: string } | null;
};

const result = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  teacher_id: z.string(),
  moved_from_id: z.string().nullable(),
});
const iso = (t: string) => new Date(t).toISOString();

/** pick_trial_date / trial_date_result's jsonb → TrialDateResult with UTC ISO instants. */
export function toTrialDateResult(data: unknown): TrialDateResult {
  const r = result.parse(data);
  return { ...r, starts_at: iso(r.starts_at), ends_at: iso(r.ends_at) };
}

/** The reads and the one write of «موعد تجريبي جديد» (migration 20261025000660). */
@Injectable()
export class TrialDateQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async student(id: string): Promise<TrialStudent | null> {
    const { data, error } = await this.db.from('students').select('id, status, tz, program, teacher_gender_pref, guardian:guardians(tz)').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The student's trial lessons: a platform trial (rule package 'trial') or an imported one (as StudentTrialQueries). */
  async trialLessons(studentId: string): Promise<TrialLessonRead[]> {
    const platform = await this.db.from('lesson_students').select(PLATFORM).eq('student_id', studentId).eq('lesson.rule.package', 'trial');
    if (platform.error) throw dbError(platform.error);
    const imported = await this.db
      .from('lesson_students')
      .select(IMPORTED)
      .eq('student_id', studentId)
      .eq('chargeable', false)
      .is('lesson.rule_id', null)
      .eq('lesson.instant', false)
      .is('lesson.makeup_of_id', null);
    if (imported.error) throw dbError(imported.error);
    return [...platform.data, ...imported.data];
  }

  /** profiles.full_name of who picked each date. */
  async names(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.db.from('profiles').select('id, full_name').in('id', [...ids]);
    if (error) throw dbError(error);
    return new Map(data.map((p) => [p.id, p.full_name]));
  }

  /** The students of a lesson (the sales slot grid keeps excludeLessonId only for her own). */
  async lessonStudents(lessonId: string): Promise<string[]> {
    const { data, error } = await this.db.from('lesson_students').select('student_id').eq('lesson_id', lessonId);
    if (error) throw dbError(error);
    return data.map((r) => r.student_id);
  }

  /** The date this request already picked: a moved lesson's id is the request id; a new one's rule carries it. */
  async replay(requestId: string): Promise<TrialDateResult | null> {
    const moved = await this.result(requestId);
    if (moved) return moved;
    const { data: rule, error } = await this.db.from('schedule_rules').select('id').eq('client_request_id', requestId).maybeSingle();
    if (error) throw dbError(error);
    if (!rule) return null;
    const { data: first, error: failed } = await this.db
      .from('lessons')
      .select('id')
      .eq('rule_id', rule.id)
      .order('starts_at')
      .limit(1)
      .maybeSingle();
    if (failed) throw dbError(failed);
    return first ? this.result(first.id) : null;
  }

  /** One transaction: 409 trial_date_subscribed (a payment came in), conflict / stale on a lost race. */
  async pick(p: TrialPick): Promise<TrialDateResult> {
    const { data, error } = await this.db.rpc('pick_trial_date', { p: p as unknown as Json });
    if (error?.code === 'P0001' && error.message === 'trial_date_subscribed') throw domainError(HttpStatus.CONFLICT, 'trial_date_subscribed');
    // The upcoming trial changed meanwhile (moved or cancelled by someone else): pick again.
    if (error?.code === 'P0001' && error.message === 'invalid_transition') throw domainError(HttpStatus.CONFLICT, 'trial_changed');
    if (error) throw dbError(error);
    return toTrialDateResult(data);
  }

  private async result(lessonId: string): Promise<TrialDateResult | null> {
    const { data, error } = await this.db.rpc('trial_date_result', { p_lesson: lessonId });
    if (error) throw dbError(error);
    return data ? toTrialDateResult(data) : null;
  }
}
