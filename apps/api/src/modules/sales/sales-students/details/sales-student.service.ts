import type { SalesPackageSummary, SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '../../../../common/auth/chat-phone';
import { can } from '../../../../common/auth/permissions';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { packageSummaries, SalesRosterRepo } from '@/modules/sales/sales';
import { SalesStudentScope } from '../sales-student-scope';
import { scheduleWindow, toStudentSchedule } from './sales-student-schedule.mapper';
import { toTrialLessons } from './sales-student-trial.mapper';
import { toStudentDetails } from './sales-student.mapper';
import { SalesStudentQueries } from './sales-student.queries';
import { SalesStudentReads } from './sales-student.reads';

/**
 * «تفاصيل الطالب» of the salesperson (docs/16 row 36): ANY student (owner 2026-10-28) with its trial,
 * attendance, «الجدول» (weekly slots, the next lessons; no link), the current package's summary, the
 * subscriptions (no payments) and the sent reports as the teacher sees them: every student reads as hers
 * (owner 2026-10-30, «Make all assistants see all»); `mine` only marks hers for the money actions. Read-only.
 */
@Injectable()
export class SalesStudentService {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentQueries,
    private readonly reads: SalesStudentReads,
    private readonly roster: SalesRosterRepo,
  ) {}

  async details(user: AuthUser, studentId: string, now = new Date()): Promise<SalesStudentDetails> {
    const { own, mine } = await this.scope.access(user, studentId);
    const student = await this.queries.student(studentId);
    if (!student) throw notFound('student_not_found');
    const [history, lessons, reports, rules, upcoming, trials, pkg] = await Promise.all([
      this.reads.histories.history(studentId),
      this.queries.pastLessons(studentId, now),
      this.reads.sentReports(studentId),
      this.queries.rules(studentId),
      this.queries.upcoming(studentId, scheduleWindow(now)),
      this.queries.trialDates.trialLessons(studentId),
      this.currentPackage(studentId),
    ]);
    const schedule = toStudentSchedule({ rules, lessons: upcoming, own: own.studentIds, studentTz: student.tz }, now);
    // «مدفوعة جزئيًا» (owner 2026-10-28): the price for a viewer who sees it in her money views already, any student.
    const prices = can(user, 'self.sales_money') ? await this.queries.prices(studentId) : [];
    const trial = toTrialLessons(trials, now);
    const parts = { student, history, lessons, reports, schedule, trial, mine, prices };
    const view = toStudentDetails({ ...parts, package: pkg });
    return { ...view, student: { ...view.student, guardian_phone: chatPhone(user, view.student.guardian_phone) } };
  }

  /** The current package of ANY student (owner 2026-10-30): no price, payment or commission. */
  private async currentPackage(studentId: string): Promise<SalesPackageSummary | null> {
    const rows = await this.roster.packages([studentId]);
    return (await packageSummaries(this.roster, rows)).get(studentId) ?? null;
  }

  /** «تنزيل PDF» of ANY student's sent report (owner 2026-10-30): 404 for another student's report, 409 pdf_not_ready. */
  reportPdf(input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
