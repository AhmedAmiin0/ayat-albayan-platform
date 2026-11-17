import type { PortalFileUrl, PortalPrepare, PortalReports } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { recordingByLesson, toPortalReport, toPrepare } from './portal-reports.mapper';
import { PortalReportsRepo } from './portal-reports.repo';

/** How far back a recording's sent report is looked up (the «التسجيلات» list goes this far). */
const SENT_SCAN = 1000;

interface FileCall {
  user: AuthUser;
  studentId: string;
  id: string;
}

/**
 * «تقارير الحلقات» (docs/31): the reports already sent to the family, newest first. A file opens by a
 * signed link minted per tap (a PDF 5 minutes, a recording an hour for playback); the list carries none.
 */
@Injectable()
export class PortalReportsService {
  constructor(
    private readonly scopes: PortalScopes,
    private readonly queries: PortalReportsRepo,
    private readonly storage: StorageService,
  ) {}

  async list(input: { user: AuthUser; studentId: string }): Promise<PortalReports> {
    await this.scopes.student(input.user, input.studentId);
    const rows = await this.queries.sent(input.studentId);
    const recordings = recordingByLesson(await this.queries.visibleRecordings(rows.map((r) => r.lesson_id)));
    return { reports: rows.map((r) => toPortalReport(r, recordings)) };
  }

  /**
   * «ما المطلوب» of a student the caller already scoped: the newest sent report's homework and next
   * plan (never a draft); null without a sent report.
   */
  async prepare(studentId: string): Promise<PortalPrepare | null> {
    const [newest] = await this.queries.sent(studentId, 1);
    if (!newest) return null;
    return toPrepare(newest, await this.queries.texts(newest.id));
  }

  /** 404 report_not_found: not this student's, not sent yet, or no PDF. */
  async reportUrl(call: FileCall): Promise<PortalFileUrl> {
    await this.scopes.student(call.user, call.studentId);
    const row = await this.queries.oneSent({ studentId: call.studentId, reportId: call.id });
    if (!row?.pdf_path) throw notFound('report_not_found');
    return this.storage.signedDownload({ bucket: BUCKETS.reports, path: row.pdf_path, seconds: SIGNED_URL_SECONDS.portal });
  }

  /** 404 recording_not_found unless it belongs to one of this student's sent reports and is visible. */
  async recordingUrl(call: FileCall): Promise<PortalFileUrl> {
    await this.scopes.student(call.user, call.studentId);
    // Every sent report, not the list's newest 60: an old recording still opens.
    const rows = await this.queries.sent(call.studentId, SENT_SCAN);
    const visible = await this.queries.visibleRecordings(rows.map((r) => r.lesson_id));
    const row = visible.find((r) => r.id === call.id);
    if (!row) throw notFound('recording_not_found');
    // A video player keeps range-requesting the same URL while it plays: the UI lifetime (an hour).
    return this.storage.signedDownload({ bucket: BUCKETS.recordings, path: row.file_path, seconds: SIGNED_URL_SECONDS.ui });
  }
}
