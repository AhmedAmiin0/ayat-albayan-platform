import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import { badRequest, conflict, notFound } from '../../../common/http/errors';
import { rpcOutSchema, type PauseRow, type RpcOut } from './course-pause.mapper';

type RpcName = 'course_pause_start' | 'course_pause_begin' | 'course_pause_set_until' | 'course_pause_resume';
type UntypedRpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: PostgrestError | null }> };
/** The window the sheet previews: [start, end) UTC instants, end null = every future lesson. */
type PreviewWindow = { studentId: string; start: Date; end: Date | null };
/** A reopened lesson, for the clash check after a resume. */
export type ReopenedLesson = { id: string; teacher_id: string; starts_at: string; ends_at: string };

const PAUSE_SELECT = 'id, student_id, from_date, until_date, reason, created_at, resumed_at, extended_days, creator:profiles!course_pauses_created_by_fkey(full_name)';
const BAD_REQUEST = new Set(['date_in_past', 'invalid_range']);
const CONFLICT = new Set(['already_paused', 'pause_not_open']);
const NOT_FOUND = new Set(['student_not_found', 'pause_not_found']);

/** The RPCs' raised codes (migration 951) → 400 / 409 / 404; a lost race on the one-open index → already_paused. */
export function pauseRpcError(error: PostgrestError): Error {
  if (error.code === 'P0001' && BAD_REQUEST.has(error.message)) return badRequest(error.message);
  if (error.code === 'P0001' && CONFLICT.has(error.message)) return conflict(error.message);
  if (error.code === 'P0001' && NOT_FOUND.has(error.message)) return notFound(error.message);
  if (error.code === '23505' && error.message.includes('course_pauses_one_open')) return conflict('already_paused');
  return dbError(error);
}

/** course_pauses reads and the three RPCs (service role; the routes check courses.pause). docs/11 §7b. */
@Injectable()
export class CoursePauseQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async call(fn: RpcName, p: Record<string, unknown>): Promise<RpcOut> {
    const { data, error } = await (this.db as unknown as UntypedRpc).rpc(fn, { p });
    if (error) throw pauseRpcError(error);
    return rpcOutSchema.parse(data);
  }

  async studentExists(studentId: string): Promise<boolean> {
    const { count, error } = await this.db.from('students').select('id', { count: 'exact', head: true }).eq('id', studentId);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }

  /** The student's pauses, newest first (the open one, if any, is first: one open per student). */
  async pauses(studentId: string): Promise<PauseRow[]> {
    const { data, error } = await this.db.from('course_pauses').select(PAUSE_SELECT)
      .eq('student_id', studentId).order('created_at', { ascending: false }).limit(20);
    if (error) throw dbError(error);
    return data;
  }

  async pause(id: string): Promise<PauseRow | null> {
    const { data, error } = await this.db.from('course_pauses').select(PAUSE_SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async openPauseId(studentId: string): Promise<string | null> {
    const { data, error } = await this.db.from('course_pauses').select('id').eq('student_id', studentId).is('resumed_at', null).maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }

  /** Open pauses whose until day is before `today` (Riyadh): the daily job resumes them. */
  async due(today: string): Promise<string[]> {
    const { data, error } = await this.db.from('course_pauses').select('id').is('resumed_at', null).lt('until_date', today).order('id').limit(500);
    if (error) throw dbError(error);
    return data.map((r) => r.id);
  }

  /** Open pauses from a later day whose from day has come (Riyadh `today`): the hourly job begins them. */
  async dueStarts(today: string): Promise<string[]> {
    const { data, error } = await this.db.from('course_pauses').select('id').is('started_at', null).is('resumed_at', null)
      .lte('from_date', today).order('id').limit(500);
    if (error) throw dbError(error);
    return data.map((r) => r.id);
  }

  /** How many open lessons of the student start in the window (what course_pause_window will take). */
  async previewCount(w: PreviewWindow): Promise<number> {
    let q = this.db.from('lesson_students').select('lesson_id, lesson:lessons!inner(id)', { count: 'exact', head: true })
      .eq('student_id', w.studentId).in('lesson.status', ['scheduled', 'confirmed']).gt('lesson.starts_at', w.start.toISOString());
    if (w.end) q = q.lt('lesson.starts_at', w.end.toISOString());
    const { count, error } = await q;
    if (error) throw dbError(error);
    return count ?? 0;
  }

  /**
   * A package paused by the old package-only button (before 2026-10-28: no course_pauses row): the student's
   * newest live package back to the neutral 'unpaid' (the recompute derives its status). Its id, or null.
   */
  async liftLegacyPause(studentId: string): Promise<string | null> {
    const { data: newest, error } = await this.db.from('subscriptions').select('id, status').eq('student_id', studentId)
      .neq('status', 'cancelled').order('starts_on', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw dbError(error);
    if (newest?.status !== 'paused') return null;
    const { data, error: e2 } = await this.db.from('subscriptions').update({ status: 'unpaid' }).eq('id', newest.id).eq('status', 'paused').select('id').maybeSingle();
    if (e2) throw dbError(e2);
    return data?.id ?? null;
  }

  async lessons(ids: readonly string[]): Promise<ReopenedLesson[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('lessons').select('id, teacher_id, starts_at, ends_at').in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }
}
