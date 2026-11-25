import type { SalesPackageSummary, SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '@/common/auth/chat-phone';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { packageSummaries, SalesRosterRepo } from '@/modules/sales/sales';
import { SalesStudentScope } from '@/modules/sales/sales-students/shared/sales-student-scope';
import { scheduleWindow, toStudentSchedule } from './sales-student-schedule.mapper';
import { toTrialLessons } from './sales-student-trial.mapper';
import { toStudentFamily } from './sales-student-family.mapper';
import { toStudentDetails } from './sales-student.mapper';
import { SalesStudentRepo } from '@/modules/sales/sales-students/shared/sales-student.repo';
import { SalesStudentReads } from './sales-student.reads';

/** docs/16 row 36: any student, read-only; `mine` only marks hers for the money actions. */
@Injectable()
export class SalesStudentService {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentRepo,
    private readonly reads: SalesStudentReads,
    private readonly roster: SalesRosterRepo,
  ) {}

  async details(user: AuthUser, studentId: string, now = new Date()): Promise<SalesStudentDetails> {
    const { own, acts } = await this.scope.access(user, studentId);
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
    const facts = { rules, lessons: upcoming, own: own.studentIds, studentTz: student.tz };
    const schedule = toStudentSchedule(facts, now);
    // The price only for a viewer who already sees it in her money views.
    const prices = can(user, 'self.sales_money') ? await this.queries.prices(studentId) : [];
    const trial = toTrialLessons(trials, now);
    const parts = { student, history, lessons, reports, schedule, trial, mine: acts, prices };
    const view = toStudentDetails({ ...parts, package: pkg });
    const phone = chatPhone(user, view.student.guardian_phone);
    const family = toStudentFamily(student, can(user, 'inbox.read'));
    return { ...view, student: { ...view.student, guardian_phone: phone }, family };
  }

  /** The current package of ANY student: no price, payment or commission. */
  private async currentPackage(studentId: string): Promise<SalesPackageSummary | null> {
    const rows = await this.roster.packages([studentId]);
    return (await packageSummaries(this.roster, rows)).get(studentId) ?? null;
  }

  /** Any student's sent report; 404 for another's, 409 pdf_not_ready. */
  reportPdf(input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
