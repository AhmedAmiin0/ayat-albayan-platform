import type { SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { SalesStudentScope } from '../sales-student-scope';
import { toStudentDetails } from './sales-student.mapper';
import { SalesStudentQueries } from './sales-student.queries';
import { SalesStudentReads } from './sales-student.reads';

/**
 * «تفاصيل الطالب» of the salesperson (owner 2026-10-27, docs/16 row 36): one of HER students, its
 * subscriptions (no payments), its attendance and its sent reports as the teacher sees them. Read-only.
 */
@Injectable()
export class SalesStudentService {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentQueries,
    private readonly reads: SalesStudentReads,
  ) {}

  async details(user: AuthUser, studentId: string, now = new Date()): Promise<SalesStudentDetails> {
    await this.scope.assertStudent(user, studentId);
    const [student, history, lessons, reports] = await Promise.all([
      this.queries.student(studentId),
      this.reads.histories.history(studentId),
      this.queries.pastLessons(studentId, now),
      this.reads.sentReports(studentId),
    ]);
    if (!student) throw notFound('student_not_found');
    return toStudentDetails({ student, history, lessons, reports });
  }

  /** «تنزيل PDF» of one of her student's sent reports: 404 for another student's report, 409 pdf_not_ready. */
  async reportPdf(user: AuthUser, input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    await this.scope.assertStudent(user, input.studentId);
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
