import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { applySort } from '../../../common/list-sort';
import { readAll } from '../../teaching/scheduling/read-all';
import { dbError, type Page } from '../../../common/http/http';
import { CURRENT_STUDENT_STATUSES, NOT_SUBSCRIBED_STATUSES, type TeacherStudentCounts } from '@ab/shared';
import { applyTeacherFilters, TEACHER_SORT, tallyKinds, type TeacherListQuery } from './teachers.list';
import { teacherSearchFilter } from './teachers.mapper';

export type Teacher = Tables<'teachers'>;
/** A row of GET /teachers: the teacher and her «مشترك / تجريبي» counts (R-TCH-03, owner 2026-10-12). */
export type TeacherListRow = Teacher & TeacherStudentCounts;

/** All supabase access for `teachers` (service role — callers enforce roles). R-TCH-01. */
@Injectable()
export class TeachersQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Search, column filters, allowlisted sort (default: Arabic name), `id` as the last tiebreaker; each
   * row with its active / trial student counts.
   */
  async list(q: TeacherListQuery): Promise<Page<TeacherListRow>> {
    const { page, pageSize, search } = q;
    const from = (page - 1) * pageSize;
    let query = applyTeacherFilters(this.db.from('teachers').select('*', { count: 'exact' }), q);
    const filter = search ? teacherSearchFilter(search) : null;
    if (filter) query = query.or(filter);
    const { data, count, error } = await applySort(query, q, TEACHER_SORT)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw dbError(error);
    const counts = await this.studentCounts(data.map((row) => row.id));
    const none: TeacherStudentCounts = { active_count: 0, trial_count: 0 };
    const items = data.map((row) => ({ ...row, ...(counts.get(row.id) ?? none) }));
    return { items, total: count ?? 0, page, pageSize };
  }

  /** «مشترك» (active) and «تجريبي» (new, trial, pending_subscription; owner 2026-10-15) students per teacher of one page (≤ 100 ids: one `.in()`), past max_rows. */
  async studentCounts(teacherIds: readonly string[]): Promise<Map<string, TeacherStudentCounts>> {
    if (teacherIds.length === 0) return new Map();
    const rows = await readAll((from, to) =>
      this.db
        .from('students')
        .select('teacher_id, status')
        .in('teacher_id', [...teacherIds])
        .in('status', ['active', ...NOT_SUBSCRIBED_STATUSES])
        .order('id')
        .range(from, to),
    );
    return tallyKinds(rows);
  }

  async get(id: string): Promise<Teacher | null> {
    const { data, error } = await this.db.from('teachers').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async insert(row: TablesInsert<'teachers'>): Promise<Teacher> {
    const { data, error } = await this.db.from('teachers').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'teachers'>): Promise<Teacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** false when no row matched. Fails with 409 while students still reference the teacher. */
  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('teachers').delete().eq('id', id).select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /**
   * Current load: students with the teacher whose status is current (CURRENT_STUDENT_STATUSES: new |
   * trial | pending_subscription | active | pending_renewal | expired, owner 2026-10-15) for booking options and the
   * all-teachers calendar. No ids = every teacher.
   * ponytail: counts rows in JS — fine for one academy; a grouped view if teachers get thousands.
   */
  async loads(teacherIds?: readonly string[]): Promise<Map<string, number>> {
    // readAll: more than max_rows (1000) students must not be cut off silently.
    const data = await readAll((from, to) => {
      let query = this.db.from('students').select('teacher_id').in('status', [...CURRENT_STUDENT_STATUSES]);
      query = teacherIds ? query.in('teacher_id', [...teacherIds]) : query.not('teacher_id', 'is', null);
      return query.order('id').range(from, to);
    });
    const counts = new Map<string, number>();
    for (const { teacher_id: id } of data) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  /** teachers.id of the signed-in user (JWT sub = profiles.id = teachers.profile_id). */
  async idByProfile(profileId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.id ?? null;
  }
}
