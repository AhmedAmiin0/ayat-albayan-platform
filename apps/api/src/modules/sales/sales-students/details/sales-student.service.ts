import type { SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '../../../../common/auth/chat-phone';
import { can } from '../../../../common/auth/permissions';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { SalesStudentScope } from '../sales-student-scope';
import { scheduleWindow, toStudentSchedule } from './sales-student-schedule.mapper';
import { toStudentDetails } from './sales-student.mapper';
import { SalesStudentQueries } from './sales-student.queries';
import { SalesStudentReads } from './sales-student.reads';

/**
 * «تفاصيل الطالب» of the salesperson (owner 2026-10-27, docs/16 row 36): one of HER students, its
 * subscriptions (no payments), its attendance, its sent reports as the teacher sees them and «الجدول»
 * (weekly slots, the next lessons; no link). Read-only.
 */
@Injectable()
export class SalesStudentService {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentQueries,
    private readonly reads: SalesStudentReads,
  ) {}

  async details(user: AuthUser, studentId: string, now = new Date()): Promise<SalesStudentDetails> {
    const own = await this.scope.assertStudent(user, studentId);
    const [student, history, lessons, reports, rules, upcoming] = await Promise.all([
      this.queries.student(studentId),
      this.reads.histories.history(studentId),
      this.queries.pastLessons(studentId, now),
      this.reads.sentReports(studentId),
      this.queries.rules(studentId),
      this.queries.upcoming(studentId, scheduleWindow(now)),
    ]);
    if (!student) throw notFound('student_not_found');
    const schedule = toStudentSchedule({ rules, lessons: upcoming, own: own.studentIds, studentTz: student.tz }, now);
    // «مدفوعة جزئيًا» (owner 2026-10-28): the price only for a viewer who sees it in her money views already.
    const prices = can(user, 'self.sales_money') ? await this.queries.prices(studentId) : [];
    const view = toStudentDetails({ student, history, lessons, reports, schedule, prices });
    return { ...view, student: { ...view.student, guardian_phone: chatPhone(user, view.student.guardian_phone) } };
  }

  /** «تنزيل PDF» of one of her student's sent reports: 404 for another student's report, 409 pdf_not_ready. */
  async reportPdf(user: AuthUser, input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    await this.scope.assertStudent(user, input.studentId);
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
