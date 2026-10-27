import type { PortalFileUrl, PortalReports } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { BUCKETS, SIGNED_URL_SECONDS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { PortalScopes } from '../scope/portal-scope';
import { recordingByLesson, toPortalReport } from './portal-reports.mapper';
import { PortalReportsQueries } from './portal-reports.queries';

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
    private readonly queries: PortalReportsQueries,
    private readonly storage: StorageService,
  ) {}

  async list(input: { user: AuthUser; studentId: string }): Promise<PortalReports> {
    await this.scopes.student(input.user, input.studentId);
    const rows = await this.queries.sent(input.studentId);
    const recordings = recordingByLesson(await this.queries.visibleRecordings(rows.map((r) => r.lesson_id)));
    return { reports: rows.map((r) => toPortalReport(r, recordings)) };
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
    const rows = await this.queries.sent(call.studentId);
    const visible = await this.queries.visibleRecordings(rows.map((r) => r.lesson_id));
    const row = visible.find((r) => r.id === call.id);
    if (!row) throw notFound('recording_not_found');
    // A video player keeps range-requesting the same URL while it plays: the UI lifetime (an hour).
    return this.storage.signedDownload({ bucket: BUCKETS.recordings, path: row.file_path, seconds: SIGNED_URL_SECONDS.ui });
  }
}
