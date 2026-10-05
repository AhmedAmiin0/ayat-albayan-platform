import { RECEIPT_MAX_BYTES, type ReceiptUpload, type SignedDownload, type SignedUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BUCKETS, isPathOf, receiptPath } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { badRequest, notFound } from '../scheduling/errors';
import { PaymentsQueries, type PaymentSubscription } from './payments.queries';

/**
 * Receipts in the private `receipts` bucket (R-PAY-01, R-MOB-02 camera): the client uploads to a
 * signed URL for receipts/{subscription_id}/{uuid}.{ext}, then registers the path on the payment.
 */
@Injectable()
export class ReceiptsService {
  constructor(
    private readonly payments: PaymentsQueries,
    private readonly storage: StorageService,
  ) {}

  /** P6 (404 subscription_not_found; 400 receipt_too_large over maxBytes = settings.upload_max_mb). */
  async uploadUrl(input: ReceiptUpload, maxBytes = RECEIPT_MAX_BYTES): Promise<SignedUpload> {
    if (input.size > maxBytes) throw badRequest('receipt_too_large');
    const sub = await this.subscription(input.subscriptionId);
    return this.storage.signedUpload({
      bucket: BUCKETS.receipts,
      path: receiptPath({ subscriptionId: sub.id, mime: input.mime }),
    });
  }

  /** P7: signed for 1 h; 404 receipt_not_found when the payment has none. */
  async download(path: string | null): Promise<SignedDownload> {
    if (!path) throw notFound('receipt_not_found');
    return this.storage.signedDownload({ bucket: BUCKETS.receipts, path });
  }

  /** A client-sent path must be this package's and already uploaded (docs/11 §3), else 400. */
  async check(subscriptionId: string, path: string): Promise<void> {
    const ok = isPathOf(path, subscriptionId) && (await this.storage.exists({ bucket: BUCKETS.receipts, path }));
    if (!ok) throw badRequest('receipt_path');
  }

  /** Best effort: an orphaned object is harmless once its payment is gone. */
  async discard(path: string | null): Promise<void> {
    if (path) await this.storage.remove({ bucket: BUCKETS.receipts, path }).catch(() => undefined);
  }

  async subscription(id: string): Promise<PaymentSubscription> {
    const sub = await this.payments.subscription(id);
    if (!sub) throw notFound('subscription_not_found');
    return sub;
  }
}
