import type {
  AttachmentRegister,
  AttachmentUpload,
  ReportAttachmentView,
  SignedDownload,
  SignedUpload,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { ReportFilesService } from '@/modules/reporting/reports/files/report-files.service';
import { TeacherLinkAccess } from './teacher-link.access';

/** One file call through the link: its token, the report (of the link's lesson). */
export interface LinkFileCall {
  token: string;
  reportId: string;
}

/**
 * The teacher's attachments through their report link (owner 2026-11-06): the SAME files service
 * as the signed-in routes (signed Storage upload, the path checked under the report, the edit
 * window: 409 edit_window_closed once it shuts), with the link's teacher as the caller. The link's
 * checks run first on every call (TeacherLinkAccess: signature, lesson, window, this report).
 */
@Injectable()
export class TeacherLinkFiles {
  constructor(
    private readonly access: TeacherLinkAccess,
    private readonly files: ReportFilesService,
  ) {}

  async uploadUrl(call: LinkFileCall & { file: AttachmentUpload }): Promise<SignedUpload> {
    const user = await this.caller(call);
    return this.files.uploadUrl({ id: call.reportId, user, file: call.file });
  }

  async register(call: LinkFileCall & { file: AttachmentRegister }): Promise<ReportAttachmentView> {
    const user = await this.caller(call);
    return this.files.register({ id: call.reportId, user, file: call.file });
  }

  async remove(call: LinkFileCall & { attachmentId: string }): Promise<void> {
    const user = await this.caller(call);
    await this.files.remove({ id: call.reportId, attachmentId: call.attachmentId, user });
  }

  async url(call: LinkFileCall & { attachmentId: string }): Promise<SignedDownload> {
    const user = await this.caller(call);
    return this.files.attachmentUrl({ id: call.reportId, attachmentId: call.attachmentId, user });
  }

  private async caller(call: LinkFileCall) {
    const scope = await this.access.report(
      { token: call.token, reportId: call.reportId },
      new Date(),
    );
    return scope.caller;
  }
}
