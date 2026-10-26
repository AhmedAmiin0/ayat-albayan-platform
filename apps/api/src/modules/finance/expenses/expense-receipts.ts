import type { SignedDownload, SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS, isPathOf, uploadName } from '../../../common/storage/storage.paths';
import { StorageService } from '../../../common/storage/storage.service';
import { badRequest, notFound } from '../../../common/http/errors';

/** Expense receipts live in the private receipts bucket under receipts/expenses/{uuid}.{ext}. */
export const EXPENSE_FOLDER = 'expenses';

/** Signed upload (the payments pattern), path check before storing, signed download. */
@Injectable()
export class ExpenseReceipts {
  constructor(private readonly storage: StorageService) {}

  uploadUrl(mime: string): Promise<SignedUpload> {
    return this.storage.signedUpload({ bucket: BUCKETS.receipts, path: `${EXPENSE_FOLDER}/${uploadName(mime)}` });
  }

  async check(path: string): Promise<void> {
    const ok = isPathOf(path, EXPENSE_FOLDER) && (await this.storage.exists({ bucket: BUCKETS.receipts, path }));
    if (!ok) throw badRequest('receipt_path');
  }

  download(path: string | null): Promise<SignedDownload> {
    if (!path) throw notFound('receipt_not_found');
    return this.storage.signedDownload({ bucket: BUCKETS.receipts, path });
  }

  /** Best effort: an orphaned object is harmless. */
  async discard(path: string | null): Promise<void> {
    if (path) await this.storage.remove({ bucket: BUCKETS.receipts, path }).catch(() => undefined);
  }
}
