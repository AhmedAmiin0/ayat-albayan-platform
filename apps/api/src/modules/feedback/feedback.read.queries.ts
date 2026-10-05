import type { FeedbackAverage, FeedbackQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../common/db/db.module';
import { dbError, type PageQuery } from '../teachers/http';
import type { FeedbackRow } from './feedback.queries';

/** Every column but the link hash and the guardian: those never leave the API. */
const LIST_COLUMNS =
  'id, lesson_id, student_id, teacher_id, kind, requested_at, expires_at, rating, recommend, note, contact_phone, submitted_at, quick_rating, quick_rated_at' as const;

export type FeedbackListRow = Pick<
  FeedbackRow,
  | 'id' | 'lesson_id' | 'student_id' | 'teacher_id' | 'kind' | 'requested_at' | 'expires_at'
  | 'rating' | 'recommend' | 'note' | 'contact_phone' | 'submitted_at' | 'quick_rating' | 'quick_rated_at'
>;
export type FeedbackPage = { rows: FeedbackListRow[]; total: number };
export type AverageRow = FeedbackAverage & { teacher_id: string };

const DAY_MS = 86_400_000;

const bounds = (p: PageQuery): [number, number] => [(p.page - 1) * p.pageSize, p.page * p.pageSize - 1];

function rows(res: { data: FeedbackListRow[] | null; count: number | null; error: PostgrestError | null }): FeedbackPage {
  if (res.error) throw dbError(res.error);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}

/** GET /feedback, /feedback/summary and /teachers/me/feedback reads (service role; services scope by role). */
@Injectable()
export class FeedbackReadQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Newest request first. `from`/`to` are UTC days of the request; a rating filter means answered only. */
  async page(input: { filter: FeedbackQuery; page: PageQuery }): Promise<FeedbackPage> {
    const { filter, page } = input;
    let q = this.db.from('lesson_feedback').select(LIST_COLUMNS, { count: 'exact' });
    if (filter.teacher) q = q.eq('teacher_id', filter.teacher);
    if (filter.lesson) q = q.eq('lesson_id', filter.lesson);
    if (filter.kind) q = q.eq('kind', filter.kind);
    if (filter.rating) q = q.eq('rating', filter.rating);
    if (filter.from) q = q.gte('requested_at', `${filter.from}T00:00:00Z`);
    if (filter.to) q = q.lt('requested_at', new Date(Date.parse(`${filter.to}T00:00:00Z`) + DAY_MS).toISOString());
    return rows(await q.order('requested_at', { ascending: false }).range(...bounds(page)));
  }

  /** A teacher's own rows: the filter is the login, never a request parameter. */
  async mine(teacherId: string, page: PageQuery): Promise<FeedbackPage> {
    const q = this.db.from('lesson_feedback').select(LIST_COLUMNS, { count: 'exact' }).eq('teacher_id', teacherId);
    return rows(await q.order('requested_at', { ascending: false }).range(...bounds(page)));
  }

  /** Per-teacher averages over answered rows (v_teacher_feedback_avg); `teacherId` limits to one. */
  async averages(teacherId?: string): Promise<AverageRow[]> {
    const q = this.db.from('v_teacher_feedback_avg').select('teacher_id, avg_rating, n, recommend_yes_pct');
    const { data, error } = await (teacherId ? q.eq('teacher_id', teacherId) : q);
    if (error) throw dbError(error);
    return data.flatMap((r) =>
      r.teacher_id === null || r.n === null || r.n === 0
        ? []
        : [{ teacher_id: r.teacher_id, avg_rating: Number(r.avg_rating), n: r.n, recommend_yes_pct: Number(r.recommend_yes_pct) }],
    );
  }

  async students(ids: readonly string[]): Promise<{ id: string; code: string | null; name: string }[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('students').select('id, code, name').in('id', [...new Set(ids)]);
    if (error) throw dbError(error);
    return data;
  }

  async teachers(ids: readonly string[]): Promise<{ id: string; display_name_ar: string }[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('teachers').select('id, display_name_ar').in('id', [...new Set(ids)]);
    if (error) throw dbError(error);
    return data;
  }
}
