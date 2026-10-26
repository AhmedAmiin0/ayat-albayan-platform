import type { SignedDownload, SignedUpload, TeacherReceiptUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS, isPathOf, teacherReceiptPath } from '../../../common/storage/storage.paths';
import { StorageService } from '../../../common/storage/storage.service';
import { badRequest, notFound } from '../../../common/http/errors';

/** Teacher payment receipts in the private `receipts` bucket, under receipts/{teacher_id}/{uuid}.{ext}. */
@Injectable()
export class EarningsReceipts {
  constructor(private readonly storage: StorageService) {}

  uploadUrl(teacherId: string, input: TeacherReceiptUpload): Promise<SignedUpload> {
    return this.storage.signedUpload({ bucket: BUCKETS.receipts, path: teacherReceiptPath({ teacherId, mime: input.mime }) });
  }

  /** A client-sent path must be this teacher's folder and already uploaded, else 400. */
  async check(teacherId: string, path: string): Promise<void> {
    const ok = isPathOf(path, teacherId) && (await this.storage.exists({ bucket: BUCKETS.receipts, path }));
    if (!ok) throw badRequest('receipt_path');
  }

  download(path: string | null): Promise<SignedDownload> {
    if (!path) throw notFound('receipt_not_found');
    return this.storage.signedDownload({ bucket: BUCKETS.receipts, path });
  }
}
