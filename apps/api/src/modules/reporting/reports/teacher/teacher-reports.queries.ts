import type { TeacherReportSortKey, TeacherReportsQuery } from '@ab/shared';
import type { Attendance, Grade, PdfStatus, ReportStatus } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage } from '@/common/db/page';
import { studentIdsMatching } from '@/common/student-ids';
import type { PageQuery } from '@/common/http/http';
import { pgError } from '@/common/db/errors';

export interface TeacherReportRow {
  id: string;
  lesson_id: string;
  student_id: string;
  attendance: Attendance | null;
  grade_overall: Grade | null;
  status: ReportStatus;
  submitted_at: string | null;
  pdf_status: PdfStatus | null;
  sent_at: string | null;
}
export interface ReportStudent {
  id: string;
  code: string | null;
  name: string;
}

const COLUMNS =
  'id, lesson_id, student_id, attendance, grade_overall, status, submitted_at, pdf_status, sent_at' as const;

/** R-NFR-08: newest submit first by default; empty attendance/grade last; ties by id (stable pages). */
const TEACHER_REPORT_SORT: SortSpec<TeacherReportSortKey> = {
  columns: {
    submitted: { column: 'submitted_at' },
    attendance: { column: 'attendance', nullsFirst: false },
    grade: { column: 'grade_overall', nullsFirst: false },
  },
  fallback: [{ column: 'submitted_at', ascending: false }],
};

/** GET /teachers/me/reports reads (R-REP-02, R-TCH-03). Service role; the service scopes by teacher. */
@Injectable()
export class TeacherReportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** One page of the teacher's submitted reports: filtered, then sorted (default newest submit first). */
  async page(input: {
    teacherId: string;
    filter?: TeacherReportsQuery;
    page: PageQuery;
  }): Promise<{ rows: TeacherReportRow[]; total: number }> {
    const filter = input.filter ?? {};
    const students = filter.student ? await studentIdsMatching(this.db, filter.student) : null;
    if (students?.length === 0) return { rows: [], total: 0 };
    const read = () => {
      let q = this.db
        .from('lesson_reports')
        .select(COLUMNS, { count: 'exact' })
        .eq('teacher_id', input.teacherId)
        .eq('status', 'submitted');
      if (filter.attendance) q = q.eq('attendance', filter.attendance);
      if (filter.grade) q = q.eq('grade_overall', filter.grade);
      return students ? q.in('student_id', students) : q;
    };
    const order = { ...input.page, sort: filter.sort, dir: filter.dir };
    return readPage(read, order, TEACHER_REPORT_SORT);
  }

  /** The page's students (a page is at most 100 rows, so one `in`). */
  async students(ids: readonly string[]): Promise<ReportStudent[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name')
      .in('id', [...new Set(ids)]);
    if (error) throw pgError(error);
    return data;
  }
}
