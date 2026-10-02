import type { Attendance, Grade, PdfStatus, ReportStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
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

/** GET /teachers/me/reports reads (R-REP-02, R-TCH-03). Service role; the service scopes by teacher. */
@Injectable()
export class TeacherReportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** One page of the teacher's submitted reports, newest submit first. */
  async page(input: { teacherId: string; page: PageQuery }): Promise<{ rows: TeacherReportRow[]; total: number }> {
    const start = (input.page.page - 1) * input.page.pageSize;
    const { data, count, error } = await this.db
      .from('lesson_reports')
      .select(COLUMNS, { count: 'exact' })
      .eq('teacher_id', input.teacherId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
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
