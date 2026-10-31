import { addCalendarDays } from '@ab/shared';
import type { FeedbackAverage, FeedbackQuery, FeedbackSortKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../../../common/db/db.module';
import { applySort, ilikeContains, type SortSpec } from '../../../../common/list-sort';
import { studentIdsMatching } from '../../../../common/student-ids';
import { dbError, type PageQuery } from '../../../../common/http/http';
import type { FeedbackRow } from '../feedback.queries';

/**
 * Every column but the link hash and the guardian: those never leave the API. The teacher's name
 * is embedded so the list can order by it (to-one: `order=teachers(display_name_ar)`).
 */
const LIST_COLUMNS =
  'id, lesson_id, student_id, teacher_id, kind, requested_at, expires_at, rating, recommend, note, contact_phone, submitted_at, quick_rating, quick_rated_at, teachers(display_name_ar)' as const;

/** R-NFR-08: allowlisted keys; unanswered rows (null) last either way; ties newest request first. */
const FEEDBACK_SORT: SortSpec<FeedbackSortKey> = {
  columns: {
    teacher: { column: 'teachers(display_name_ar)' },
    kind: { column: 'kind' },
    quick_rating: { column: 'quick_rating', nullsFirst: false },
    rating: { column: 'rating', nullsFirst: false },
    recommend: { column: 'recommend', nullsFirst: false },
    note: { column: 'note', nullsFirst: false },
  },
  fallback: { column: 'requested_at', ascending: false },
};

export type FeedbackListRow = Pick<
  FeedbackRow,
  | 'id' | 'lesson_id' | 'student_id' | 'teacher_id' | 'kind' | 'requested_at' | 'expires_at'
  | 'rating' | 'recommend' | 'note' | 'contact_phone' | 'submitted_at' | 'quick_rating' | 'quick_rated_at'
>;
export type FeedbackPage = { rows: FeedbackListRow[]; total: number };
export type AverageRow = FeedbackAverage & { teacher_id: string };


const bounds = (p: PageQuery): [number, number] => [(p.page - 1) * p.pageSize, p.page * p.pageSize - 1];
const EMPTY: FeedbackPage = { rows: [], total: 0 };

function rows(res: { data: FeedbackListRow[] | null; count: number | null; error: PostgrestError | null }): FeedbackPage {
  if (res.error) throw dbError(res.error);
  return { rows: res.data ?? [], total: res.count ?? 0 };
}

/** GET /feedback, /feedback/summary and /teachers/me/feedback reads (service role; services scope by role). */
@Injectable()
export class FeedbackReadQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Newest request first unless `sort` says otherwise. `from`/`to` are UTC days of the request; a
   * rating filter means answered only; `student` matches the name or code (no FK to students, so
   * their ids first), `note` contains the text.
   */
  async page(input: { filter: FeedbackQuery; page: PageQuery }): Promise<FeedbackPage> {
    const { filter, page } = input;
    const students = filter.student ? await studentIdsMatching(this.db, filter.student) : null;
    if (students?.length === 0) return EMPTY;
    let q = this.db.from('lesson_feedback').select(LIST_COLUMNS, { count: 'exact' });
    if (filter.teacher) q = q.eq('teacher_id', filter.teacher);
    if (filter.lesson) q = q.eq('lesson_id', filter.lesson);
    if (filter.kind) q = q.eq('kind', filter.kind);
    if (filter.rating) q = q.eq('rating', filter.rating);
    if (filter.recommend) q = q.eq('recommend', filter.recommend);
    if (filter.quick_rating) q = q.eq('quick_rating', filter.quick_rating);
    if (filter.note) q = q.ilike('note', ilikeContains(filter.note));
    if (students) q = q.in('student_id', students);
    if (filter.from) q = q.gte('requested_at', `${filter.from}T00:00:00Z`);
    if (filter.to) q = q.lt('requested_at', `${addCalendarDays(filter.to, 1)}T00:00:00.000Z`);
    return rows(await applySort(q, filter, FEEDBACK_SORT).range(...bounds(page)));
  }

  /** A teacher's own rows: the teacher filter is the login, never a request parameter. */
  mine(teacherId: string, input: { filter: FeedbackQuery; page: PageQuery }): Promise<FeedbackPage> {
    return this.page({ filter: { ...input.filter, teacher: teacherId }, page: input.page });
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
