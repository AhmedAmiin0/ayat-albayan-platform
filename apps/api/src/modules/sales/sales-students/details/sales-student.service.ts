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
 * attendance, «الجدول» (weekly slots, the next lessons; no link) and the current package's summary
 * (owner 2026-10-30: size, status, dates, lessons used / left; no price); of HER students (`mine`)
 * also the subscriptions (no payments) and the sent reports as the teacher sees them, never read for
 * another. Read-only.
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
      mine ? this.reads.histories.history(studentId) : null,
      this.queries.pastLessons(studentId, now),
      mine ? this.reads.sentReports(studentId) : { items: [], total: 0 },
      this.queries.rules(studentId),
      this.queries.upcoming(studentId, scheduleWindow(now)),
      this.queries.trialDates.trialLessons(studentId),
      this.currentPackage(studentId),
    ]);
    const schedule = toStudentSchedule({ rules, lessons: upcoming, own: own.studentIds, studentTz: student.tz }, now);
    // «مدفوعة جزئيًا» (owner 2026-10-28): the price only for her own student and a viewer who sees it in her money views already.
    const prices = mine && can(user, 'self.sales_money') ? await this.queries.prices(studentId) : [];
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

  /** «تنزيل PDF» of one of her student's sent reports: 404 for another student's report, 409 pdf_not_ready. */
  async reportPdf(user: AuthUser, input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    await this.scope.assertStudent(user, input.studentId);
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
