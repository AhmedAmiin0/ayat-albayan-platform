import type { Attendance, Grade, PdfStatus, ReportStatus, TeacherReportSortKey, TeacherReportsQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { applySort, type SortSpec } from '../../common/list-sort';
import { studentIdsMatching } from '../../common/student-ids';
import { dbError, type PageQuery } from '../teachers/http';

export type TeacherReportRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  attendance: Attendance | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  submitted_at: string | null;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
};
export type ReportStudent = { id: string; code: string | null; name: string };

const COLUMNS = 'id, lesson_id, student_id, attendance, grade_overall, status, submitted_at, pdf_status, sent_at' as const;

/** R-NFR-08: newest submit first by default; empty attendance/grade last; ties by id (stable pages). */
export const TEACHER_REPORT_SORT: SortSpec<TeacherReportSortKey> = {
  columns: {
    submitted: { column: 'submitted_at' },
    attendance: { column: 'attendance', nullsFirst: false },
    grade: { column: 'grade_overall', nullsFirst: false },
  },
  fallback: { column: 'submitted_at', ascending: false },
};

/** GET /teachers/me/reports reads (R-REP-02, R-TCH-03). Service role; the service scopes by teacher. */
@Injectable()
export class TeacherReportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** One page of the teacher's submitted reports: filtered, then sorted (default newest submit first). */
  async page(input: { teacherId: string; filter?: TeacherReportsQuery; page: PageQuery }): Promise<{ rows: TeacherReportRow[]; total: number }> {
    const filter = input.filter ?? {};
    const students = filter.student ? await studentIdsMatching(this.db, filter.student) : null;
    if (students?.length === 0) return { rows: [], total: 0 };
    const start = (input.page.page - 1) * input.page.pageSize;
    let q = this.db
      .from('lesson_reports')
      .select(COLUMNS, { count: 'exact' })
      .eq('teacher_id', input.teacherId)
      .eq('status', 'submitted');
    if (filter.attendance) q = q.eq('attendance', filter.attendance);
    if (filter.grade) q = q.eq('grade_overall', filter.grade);
    if (students) q = q.in('student_id', students);
    const { data, count, error } = await applySort(q, filter, TEACHER_REPORT_SORT)
      .order('id')
      .range(start, start + input.page.pageSize - 1);
    if (error) throw dbError(error);
    return { rows: data, total: count ?? 0 };
  }

  /** The page's students (a page is at most 100 rows, so one `in`). */
  async students(ids: readonly string[]): Promise<ReportStudent[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('students').select('id, code, name').in('id', [...new Set(ids)]);
    if (error) throw dbError(error);
    return data;
  }
}
