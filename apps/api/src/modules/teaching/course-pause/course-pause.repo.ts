import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { maybe, pgError, raisedAs, rows, type PgErrorMap } from '@/common/db/errors';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { rpcOutSchema, type PauseRow, type RpcOut } from './course-pause.mapper';

type RpcName =
  | 'course_pause_start'
  | 'course_pause_begin'
  | 'course_pause_set_until'
  | 'course_pause_resume';
type RpcResult = PromiseLike<{ data: unknown; error: PostgrestError | null }>;
interface UntypedRpc {
  rpc(fn: string, args: Record<string, unknown>): RpcResult;
}
/** The window the sheet previews: [start, end) UTC instants, end null = every future lesson. */
interface PreviewWindow { studentId: string; start: Date; end: Date | null }
/** A reopened lesson, for the clash check after a resume. */
interface OpenPause { id: string; subscription_id: string | null }
export interface ReopenedLesson {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
}

const PAUSE_SELECT =
  'id, student_id, from_date, until_date, reason, created_at, resumed_at, extended_days, creator:profiles!course_pauses_created_by_fkey(full_name)';
/**
 * Raised codes (migration 956) → 400 / 409 / 404; a lost race on the one-open index →
 * already_paused.
 */
const PAUSE_ERRORS: PgErrorMap = {
  constraints: { course_pauses_one_open: () => conflict('already_paused') },
  raised: {
    ...raisedAs(['date_in_past', 'invalid_range'], badRequest),
    ...raisedAs(['already_paused', 'pause_not_open'], conflict),
    ...raisedAs(['student_not_found', 'pause_not_found'], notFound),
  },
};

export const pauseRpcError = (error: PostgrestError): Error => pgError(error, PAUSE_ERRORS);

/** course_pauses reads and the RPCs (service role; routes check courses.pause). docs/11 §7b. */
@Injectable()
export class CoursePauseRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async call(fn: RpcName, p: Record<string, unknown>): Promise<RpcOut> {
    const { data, error } = await (this.db as unknown as UntypedRpc).rpc(fn, { p });
    if (error) throw pauseRpcError(error);
    return rpcOutSchema.parse(data);
  }

  async studentExists(studentId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('id', studentId);
    if (error) throw pgError(error);
    return (count ?? 0) > 0;
  }

  /** The student's pauses, newest first (the open one, if any, is first: one open per student). */
  async pauses(studentId: string): Promise<PauseRow[]> {
    const data = rows(await this.db.from('course_pauses').select(PAUSE_SELECT)
      .eq('student_id', studentId).order('created_at', { ascending: false }).limit(20));
    return data;
  }

  async pause(id: string): Promise<PauseRow | null> {
    const data = maybe(
      await this.db.from('course_pauses').select(PAUSE_SELECT).eq('id', id).maybeSingle(),
    );
    return data;
  }

  /** The student's open pause (at most one) and the package it paused (null until it begins). */
  async openPause(studentId: string): Promise<OpenPause | null> {
    const data = maybe(await this.db.from('course_pauses').select('id, subscription_id')
      .eq('student_id', studentId).is('resumed_at', null).maybeSingle());
    return data;
  }

  /** Open pauses whose until day is before `today` (Riyadh): the daily job resumes them. */
  async due(today: string): Promise<string[]> {
    const data = rows(await this.db.from('course_pauses').select('id').is('resumed_at', null)
      .lt('until_date', today).order('id').limit(500));
    return data.map((r) => r.id);
  }

  /** Open pauses whose later from day has come (Riyadh `today`): the hourly job begins them. */
  async dueStarts(today: string): Promise<string[]> {
    const data = rows(await this.db.from('course_pauses').select('id')
      .is('started_at', null).is('resumed_at', null)
      .lte('from_date', today).order('id').limit(500));
    return data.map((r) => r.id);
  }

  /** The student's open lessons in the window (course_pause_window takes them), earliest first. */
  async previewStarts(w: PreviewWindow): Promise<string[]> {
    let q = this.db
      .from('lesson_students')
      .select('lesson:lessons!inner(starts_at)')
      .eq('student_id', w.studentId)
      .in('lesson.status', ['scheduled', 'confirmed'])
      .gt('lesson.starts_at', w.start.toISOString());
    if (w.end) q = q.lt('lesson.starts_at', w.end.toISOString());
    const { data, error } = await q;
    if (error) throw pgError(error);
    return data.map((r) => r.lesson.starts_at).sort();
  }

  /** What a resume books back now (course_pause_restore's rule), earliest first. */
  async pausedBack(pauseId: string, cutoff: Date): Promise<string[]> {
    const after = new Date(Math.max(Date.now(), cutoff.getTime())).toISOString();
    const data = rows(await this.db
      .from('course_pause_lessons')
      .select('lesson:lessons!inner(starts_at, status)')
      .eq('pause_id', pauseId)
      .eq('kind', 'cancelled')
      .eq('lesson.status', 'cancelled_by_admin')
      .gte('lesson.starts_at', after));
    return data.map((r) => r.lesson.starts_at).sort();
  }

  /** Lifts packages paused by the old package-only button (no course_pauses row) to 'unpaid'. */
  async liftLegacyPause(p: { studentId: string; subscriptionId?: string }): Promise<string[]> {
    let q = this.db.from('subscriptions').update({ status: 'unpaid' })
      .eq('student_id', p.studentId).eq('status', 'paused');
    if (p.subscriptionId) q = q.eq('id', p.subscriptionId);
    const { data, error } = await q.select('id');
    if (error) throw pgError(error);
    return data.map((r) => r.id);
  }

  async lessons(ids: readonly string[]): Promise<ReopenedLesson[]> {
    if (ids.length === 0) return [];
    const data = rows(
      await this.db.from('lessons').select('id, teacher_id, starts_at, ends_at').in('id', [...ids]),
    );
    return data;
  }
}
