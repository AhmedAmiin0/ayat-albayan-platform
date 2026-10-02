import { canEditReport } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { conflict } from '../scheduling/errors';
import { ReportAccess } from './report-access';
import type { ViewContext } from './report.mapper';
import type { ReportRow } from './report-row';
import { ReportsQueries } from './reports.queries';

/** The caller, now, the teacher's edit window and the late-cancel policy. */
export type ReportContext = ViewContext & { lateCancelHours: number | null };

/** Every report route goes through here: load + ownership (rule 9) and the edit window (R-REP-02). */
@Injectable()
export class ReportGate {
  constructor(
    private readonly queries: ReportsQueries,
    readonly access: ReportAccess,
    private readonly settings: SettingsService,
  ) {}

  /** The report, if the caller may touch it: 404, else 403 for another teacher's report. */
  async load(id: string, user: AuthUser): Promise<ReportRow> {
    const row = await this.queries.get(id);
    if (!row) throw new NotFoundException();
    await this.access.assertTeacherOf(user, row);
    return row;
  }

  async context(user: AuthUser): Promise<ReportContext> {
    const s = await this.settings.all();
    return {
      role: user.role,
      now: new Date(),
      hours: s.report_teacher_edit_hours,
      lateCancelHours: s.late_cancel_hours,
    };
  }

  /** The report while the caller may still change it (canEditReport → 409 edit_window_closed). */
  async editable(id: string, user: AuthUser): Promise<{ row: ReportRow; ctx: ReportContext }> {
    const row = await this.load(id, user);
    const ctx = await this.context(user);
    const submittedAt = row.submitted_at === null ? null : new Date(row.submitted_at);
    if (ctx.role === null || !canEditReport({ role: ctx.role, submittedAt, now: ctx.now, hours: ctx.hours })) {
      throw conflict('edit_window_closed');
    }
    return { row, ctx };
  }
}
