import type { ReportV2Draft, ReportV2Submit, ReportView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { conflict } from '../../../../common/http/errors';
import { ReportGate } from '../submit/report-gate';
import { assertForm, ReportSubmitService } from '../submit/report-submit.service';
import { reportView } from '../report.mapper';
import { ReportsQueries } from '../reports.queries';
import { contentJson, v2DraftColumns, v2SubmitColumns } from './report-v2.mapper';

type DraftInput = { id: string; form: Partial<ReportV2Draft>; user: AuthUser };
type SubmitInput = { id: string; form: ReportV2Submit; user: AuthUser };

/**
 * The new lesson report form (owner 2026-10-26, docs/design/report-form): autosave and submit of a
 * form_version 2 report. Same guards as v1 (ReportGate: only the lesson's teacher or an admin,
 * the edit window) and the same submit path, so the lesson outcome, the PDF queue and the family's
 * WhatsApp message are exactly as for v1.
 */
@Injectable()
export class ReportV2Service {
  constructor(
    private readonly gate: ReportGate,
    private readonly queries: ReportsQueries,
    private readonly submits: ReportSubmitService,
  ) {}

  /** Writes only the fields sent; 409 already_submitted after a submit, form_version_mismatch on v1. */
  async draft({ id, form, user }: DraftInput): Promise<ReportView> {
    const row = await this.gate.load(id, user);
    assertForm(row, 2);
    if (row.status !== 'draft') throw conflict('already_submitted');
    const saved = await this.queries.updateDraft(id, v2DraftColumns(form));
    if (!saved) throw conflict('already_submitted');
    return reportView(saved, await this.gate.context(user));
  }

  /** First send or an edit within the window; absent / excused store no content (v2SubmitColumns). */
  async submit({ id, form, user }: SubmitInput): Promise<ReportView> {
    const editable = await this.gate.editable(id, user);
    assertForm(editable.row, 2);
    const { columns, content } = v2SubmitColumns(form);
    return this.submits.write(
      { ...editable, user },
      { expectedVersion: form.expectedVersion, attendance: form.attendance, program: form.program, columns, content: contentJson(content) },
    );
  }
}
