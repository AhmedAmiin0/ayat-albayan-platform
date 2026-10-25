import { reportBlock, type ReportSubmit, type ReportView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { badRequest, conflict } from '../../common/http/errors';
import { ReportFollowUp } from './report-follow-up';
import { ReportGate } from './report-gate';
import { reportView, submitColumns } from './report.mapper';
import { ReportsQueries } from './reports.queries';
import { submitPayload } from './submit-plan';

export type SubmitInput = { id: string; form: ReportSubmit; user: AuthUser };
export type RetryInput = { id: string; user: AuthUser };

/**
 * POST /reports/:id/submit (docs/11 §4 R3; R-REP-02/03/04): first submit or an edit in one
 * transaction (submit_report), then the balance alerts and the PDF builder. Also R12 PDF retry.
 */
@Injectable()
export class ReportSubmitService {
  constructor(
    private readonly gate: ReportGate,
    private readonly queries: ReportsQueries,
    private readonly followUp: ReportFollowUp,
  ) {}

  async submit({ id, form, user }: SubmitInput): Promise<ReportView> {
    const { row, ctx } = await this.gate.editable(id, user);
    if (form.expectedVersion !== row.version) throw conflict('version_conflict');
    const lesson = await this.queries.lesson(row.lesson_id);
    if (!lesson) throw new NotFoundException();
    const block = reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now: ctx.now });
    if (block) throw conflict(block);
    if (!form.attendance) throw badRequest('missing_attendance');
    if (!form.program && !row.program) throw badRequest('missing_program');
    await this.queries.submit(
      submitPayload({
        report: row,
        lesson,
        current: lesson.lesson_students.find((s) => s.student_id === row.student_id) ?? null,
        columns: submitColumns(form),
        attendance: form.attendance,
        actor: user.id,
        now: ctx.now,
        lateCancelHours: ctx.lateCancelHours,
      }),
    );
    const student = lesson.lesson_students.find((s) => s.student_id === row.student_id)?.student?.name ?? '';
    await this.followUp.submitted(row, { student, teacher: lesson.teacher?.display_name_ar ?? '' });
    return this.view(id, user);
  }

  /** R12 (admin): a failed PDF goes back to pending; 409 pdf_not_failed otherwise. */
  async retryPdf({ id, user }: RetryInput): Promise<ReportView> {
    await this.gate.load(id, user);
    if (!(await this.queries.retryPdf(id))) throw conflict('pdf_not_failed');
    await this.followUp.renderPdf(id);
    return this.view(id, user);
  }

  private async view(id: string, user: AuthUser): Promise<ReportView> {
    const saved = await this.queries.get(id);
    if (!saved) throw new NotFoundException();
    return reportView(saved, await this.gate.context(user));
  }
}
