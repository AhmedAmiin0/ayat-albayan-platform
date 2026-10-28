import type { Json } from '@ab/db';
import { reportBlock, type Attendance, type Program, type ReportSubmit, type ReportView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { badRequest, conflict } from '../../../../common/http/errors';
import { ReportFollowUp } from './report-follow-up';
import { ReportGate } from './report-gate';
import { reportView, submitColumns, type FormColumns } from '../report.mapper';
import type { ReportRow } from '../report-row';
import { ReportsQueries } from '../reports.queries';
import { submitPayload } from './submit-plan';

type SubmitInput = { id: string; form: ReportSubmit; user: AuthUser };
type RetryInput = { id: string; user: AuthUser };
type Editable = Awaited<ReturnType<ReportGate['editable']>> & { user: AuthUser };
/** What a v1 or v2 form sends, as the submit writes it. content: v2 only. */
export type SubmitWrite = {
  expectedVersion: number;
  attendance: Attendance | null | undefined;
  program: Program | undefined;
  columns: FormColumns;
  content?: Json;
};

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
    const editable = await this.gate.editable(id, user);
    assertForm(editable.row, 1);
    const write = { expectedVersion: form.expectedVersion, attendance: form.attendance, program: form.program };
    return this.write({ ...editable, user }, { ...write, columns: submitColumns(form) });
  }

  /**
   * The submit itself, for both forms: checks (version, lesson, attendance, program), one
   * transaction (submit_report, or submit_report_content with v2 content), then the follow-up.
   */
  async write({ row, ctx, user }: Editable, form: SubmitWrite): Promise<ReportView> {
    if (form.expectedVersion !== row.version) throw conflict('version_conflict');
    const lesson = await this.queries.lesson(row.lesson_id);
    if (!lesson) throw new NotFoundException();
    const block = reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now: ctx.now });
    if (block) throw conflict(block);
    if (!form.attendance) throw badRequest('missing_attendance');
    if (!form.program && !row.program) throw badRequest('missing_program');
    const payload = submitPayload({
      report: row,
      lesson,
      current: lesson.lesson_students.find((s) => s.student_id === row.student_id) ?? null,
      columns: form.columns,
      attendance: form.attendance,
      actor: user.id,
      now: ctx.now,
      lateCancelHours: ctx.lateCancelHours,
    });
    await this.queries.submit(form.content === undefined ? payload : { ...payload, content: form.content });
    const student = lesson.lesson_students.find((s) => s.student_id === row.student_id)?.student?.name ?? '';
    await this.followUp.submitted(row, { student, teacher: lesson.teacher?.display_name_ar ?? '' });
    return this.view(row.id, user);
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

/** The v1 routes write v1 reports, the v2 routes v2 ones (409 form_version_mismatch: refresh the form). */
export function assertForm(row: Pick<ReportRow, 'form_version'>, version: 1 | 2): void {
  if (row.form_version !== version) throw conflict('form_version_mismatch');
}
