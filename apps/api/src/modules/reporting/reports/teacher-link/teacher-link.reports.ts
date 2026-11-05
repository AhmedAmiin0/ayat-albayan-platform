import type { ReportFormResponse, ReportView } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { ReportsService } from '@/modules/reporting/reports/reports.service';
import { ReportSubmitService } from '@/modules/reporting/reports/submit/report-submit.service';
import { ReportV2Service } from '@/modules/reporting/reports/v2/report-v2.service';
import type { LinkCall, LinkReportCall } from './teacher-link.calls';
import { TeacherLinkAccess, type LinkScope } from './teacher-link.access';

/**
 * The teacher's report through their link (no login): the SAME services as the signed-in routes
 * (drafts, versions, the lesson outcome, the PDF and report_ready behave exactly the same), with
 * the
 * link's teacher as the caller. A submit also writes an audit row naming the teacher and the link.
 */
@Injectable()
export class TeacherLinkReports {
  constructor(
    private readonly access: TeacherLinkAccess,
    private readonly reports: ReportsService,
    private readonly submits: ReportSubmitService,
  ) {}

  private readonly log = new Logger(TeacherLinkReports.name);

  /** Property injection keeps the constructor at three parameters. */
  @Inject(ReportV2Service) private readonly v2!: ReportV2Service;
  @Inject(AuditService) private readonly audit!: AuditService;

  async form(call: LinkCall): Promise<ReportFormResponse> {
    const { lessonId, caller } = await this.access.open(call.token, new Date());
    return this.reports.form(lessonId, caller);
  }

  async draft(call: LinkReportCall<'draft'>): Promise<ReportView> {
    const { caller } = await this.scope(call);
    return this.reports.draft({ id: call.reportId, form: call.form, user: caller });
  }

  async submit(call: LinkReportCall<'submit'>): Promise<ReportView> {
    const scope = await this.scope(call);
    const view = await this.submits.submit({
      id: call.reportId,
      form: call.form,
      user: scope.caller,
    });
    await this.audited(call.reportId, scope);
    return view;
  }

  async draftV2(call: LinkReportCall<'draftV2'>): Promise<ReportView> {
    const { caller } = await this.scope(call);
    return this.v2.draft({ id: call.reportId, form: call.form, user: caller });
  }

  async submitV2(call: LinkReportCall<'submitV2'>): Promise<ReportView> {
    const scope = await this.scope(call);
    const view = await this.v2.submit({ id: call.reportId, form: call.form, user: scope.caller });
    await this.audited(call.reportId, scope);
    return view;
  }

  private scope(call: { token: string; reportId: string }): Promise<LinkScope> {
    return this.access.report({ token: call.token, reportId: call.reportId }, new Date());
  }

  /**
   * Who sent it: the teacher (and their account when they have one), through the link. The report
   * is
   * already saved (submit_report wrote its own audit row): a failure here is logged, never a 500.
   */
  private async audited(reportId: string, scope: LinkScope): Promise<void> {
    const { teacherId, profileId } = scope.caller;
    const entry = {
      actorId: profileId,
      entity: 'lesson_reports',
      entityId: reportId,
      action: 'teacher_link_submit',
      after: { teacher_id: teacherId, lesson_id: scope.lessonId, via: 'teacher_link' },
    };
    await this.audit.record(entry).catch((e: unknown) => {
      this.log.warn(`teacher link audit not written for report ${reportId}: ${String(e)}`);
    });
  }
}
