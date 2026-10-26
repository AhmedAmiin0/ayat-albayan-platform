import type {
  AttachmentRegister,
  AttachmentUpload,
  ReportAttachmentView,
  SignedDownload,
  SignedUpload,
} from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { attachmentPath, BUCKETS, isPathOf } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { reportFileName } from '../../report-pdf/report-ready';
import { badRequest, conflict } from '../../../../common/http/errors';
import { ReportAttachmentsQueries } from './report-attachments.queries';
import { ReportGate } from '../submit/report-gate';

type FileRef = { id: string; user: AuthUser };
type AttachmentRef = FileRef & { attachmentId: string };

/** Report files through signed URLs: the PDF (R6) and attachments (R7–R10; R-REP-02/03). */
@Injectable()
export class ReportFilesService {
  constructor(
    private readonly gate: ReportGate,
    private readonly files: ReportAttachmentsQueries,
    private readonly storage: StorageService,
  ) {}

  /**
   * R6: 1 h signed URL to reports/{student_id}/{lesson_id}.pdf, saved as the file name the
   * guardian gets on WhatsApp («AB-0183_2026-09-29_تقرير-الحلقة.pdf»); 409 pdf_not_ready before.
   */
  async pdfUrl({ id, user }: FileRef): Promise<SignedDownload> {
    const row = await this.gate.load(id, user);
    if (row.pdf_status !== 'ready' || !row.pdf_path) throw conflict('pdf_not_ready');
    const name = await this.files.pdfName({ studentId: row.student_id, lessonId: row.lesson_id });
    const download = name ? reportFileName(name) : undefined;
    return this.storage.signedDownload({ bucket: BUCKETS.reports, path: row.pdf_path, ...(download ? { download } : {}) });
  }

  /** R7: a signed upload URL for a new object under the report (the bucket enforces type and size). */
  async uploadUrl({ id, user, file }: FileRef & { file: AttachmentUpload }): Promise<SignedUpload> {
    await this.gate.editable(id, user);
    return this.storage.signedUpload({ bucket: BUCKETS.attachments, path: attachmentPath({ reportId: id, mime: file.mime }) });
  }

  /** R8: registers an uploaded object; the path must be under this report and exist (400 attachment_path). */
  async register({ id, user, file }: FileRef & { file: AttachmentRegister }): Promise<ReportAttachmentView> {
    await this.gate.editable(id, user);
    const ref = { bucket: BUCKETS.attachments, path: file.path };
    if (!isPathOf(file.path, id) || !(await this.storage.exists(ref))) throw badRequest('attachment_path');
    return this.files.add({ report_id: id, storage_path: file.path, mime: file.mime, size: file.size, created_by: user.id });
  }

  /** R9: the row and its object. */
  async remove({ id, attachmentId, user }: AttachmentRef): Promise<void> {
    await this.gate.editable(id, user);
    const file = await this.files.get(id, attachmentId);
    if (!file) throw new NotFoundException();
    await this.storage.remove({ bucket: BUCKETS.attachments, path: file.storage_path });
    await this.files.remove(file.id);
  }

  /** R10: 1 h signed URL to one attachment. */
  async attachmentUrl({ id, attachmentId, user }: AttachmentRef): Promise<SignedDownload> {
    await this.gate.load(id, user);
    const file = await this.files.get(id, attachmentId);
    if (!file) throw new NotFoundException();
    return this.storage.signedDownload({ bucket: BUCKETS.attachments, path: file.storage_path });
  }
}
