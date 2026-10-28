import type { SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { chatPhone } from '../../../../common/auth/chat-phone';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { SalesStudentScope } from '../sales-student-scope';
import { scheduleWindow, toStudentSchedule } from './sales-student-schedule.mapper';
import { toTrialLessons } from './sales-student-trial.mapper';
import { toStudentDetails } from './sales-student.mapper';
import { SalesStudentQueries } from './sales-student.queries';
import { SalesStudentReads } from './sales-student.reads';

const NO_REPORTS = Promise.resolve({ items: [], total: 0 });

/**
 * «تفاصيل الطالب» of the salesperson (docs/16 row 36): ANY student (owner 2026-10-28) with its trial,
 * attendance and «الجدول» (weekly slots, the next lessons; no link); of HER students (`mine`) also the
 * subscriptions (no payments) and the sent reports as the teacher sees them, never read for another. Read-only.
 */
@Injectable()
export class SalesStudentService {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentQueries,
    private readonly reads: SalesStudentReads,
  ) {}

  async details(user: AuthUser, studentId: string, now = new Date()): Promise<SalesStudentDetails> {
    const { own, mine } = await this.scope.access(user, studentId);
    const student = await this.queries.student(studentId);
    if (!student) throw notFound('student_not_found');
    const [history, lessons, reports, rules, upcoming, trials] = await Promise.all([
      mine ? this.reads.histories.history(studentId) : null,
      this.queries.pastLessons(studentId, now),
      mine ? this.reads.sentReports(studentId) : NO_REPORTS,
      this.queries.rules(studentId),
      this.queries.upcoming(studentId, scheduleWindow(now)),
      this.queries.trialDates.trialLessons(studentId),
    ]);
    const schedule = toStudentSchedule({ rules, lessons: upcoming, own: own.studentIds, studentTz: student.tz }, now);
    const trial = toTrialLessons(trials, now);
    const view = toStudentDetails({ student, history, lessons, reports, schedule, trial, mine });
    return { ...view, student: { ...view.student, guardian_phone: chatPhone(user, view.student.guardian_phone) } };
  }

  /** «تنزيل PDF» of one of her student's sent reports: 404 for another student's report, 409 pdf_not_ready. */
  async reportPdf(user: AuthUser, input: { studentId: string; reportId: string }): Promise<SignedDownload> {
    await this.scope.assertStudent(user, input.studentId);
    return this.reads.files.studentPdfUrl({ id: input.reportId, studentId: input.studentId });
  }
}
