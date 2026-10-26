import { RECEIPT_MIMES, type PaymentAttachmentView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { BUCKETS, isPathOf } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { SNIFF_BYTES, sniffMime } from '../../../teaching/booking/invoice/invoice-sniff';
import { badRequest, conflict, notFound } from '../../../../common/http/errors';
import { PaymentAttachmentsQueries } from './payment-attachments.queries';
import { PaymentsQueries } from '../payments.queries';

/** A client-sent path that passed every check: the mime is the sniffed one, never the client's. */
export type CheckedAttachment = { path: string; mime: string; size: number | null };
type WithReceipt = { id: string; receipt_path: string | null };
/** paymentId: a path this payment already holds is fine (its own replay / edit); any other owner is 409. */
export type AttachmentCheck = { subscriptionId: string; paths: readonly string[]; paymentId?: string | undefined };

const MIMES: ReadonlySet<string> = new Set(RECEIPT_MIMES);

/**
 * «المرفقات» of a bank transfer (owner 2026-10-12, docs/11 §7): 0..5 files in the private `receipts` bucket
 * under the package's folder (the receipt upload URL). Each path must be the package's, uploaded, and its
 * first bytes an image / PDF (400 attachment_path / attachment_type), and held by no other payment (409
 * attachment_in_use: one file, one payment). The older payments' single
 * receipt_path is shown as the first file (legacy). Rows cascade with the payment; objects are discarded.
 */
@Injectable()
export class PaymentAttachments {
  private readonly log = new Logger(PaymentAttachments.name);

  constructor(
    private readonly rows: PaymentAttachmentsQueries,
    private readonly payments: PaymentsQueries,
    private readonly storage: StorageService,
  ) {}

  /** Every path checked before anything is written; duplicates collapse to one. */
  async check(input: AttachmentCheck): Promise<CheckedAttachment[]> {
    const paths = [...new Set(input.paths)];
    for (const path of paths) if (!isPathOf(path, input.subscriptionId)) throw badRequest('attachment_path', { path });
    const held = (await this.rows.owners(paths)).find((o) => o.paymentId !== input.paymentId);
    if (held) throw conflict('attachment_in_use', { path: held.path });
    return Promise.all(paths.map((path) => this.checkOne(path)));
  }

  /** Idempotent (unique path): safe on a replayed form. */
  async save(paymentId: string, files: readonly CheckedAttachment[], actorId: string): Promise<void> {
    if (files.length === 0) return;
    await this.rows.save(files.map((f) => ({ payment_id: paymentId, path: f.path, mime: f.mime, size: f.size, created_by: actorId })));
  }

  /** The legacy receipt first (id 'receipt'), then the rows oldest first; each signed for 1 h (a lost object is skipped). */
  async views(payment: WithReceipt): Promise<PaymentAttachmentView[]> {
    const rows = await this.rows.forPayment(payment.id);
    const legacy = payment.receipt_path
      ? [{ id: 'receipt', path: payment.receipt_path, mime: null, size: null, legacy: true }]
      : [];
    const all = [...legacy, ...rows.map((r) => ({ id: r.id, path: r.path, mime: r.mime, size: r.size, legacy: false }))];
    const signed = await Promise.all(all.map(async ({ path, ...rest }) => {
      try {
        return [{ ...rest, ...(await this.storage.signedDownload({ bucket: BUCKETS.receipts, path })) }];
      } catch (e) {
        this.log.warn(`payment ${payment.id}: attachment ${path} not signed (${e instanceof Error ? e.message : String(e)})`);
        return [];
      }
    }));
    return signed.flat();
  }

  /** A salesperson's own payment only (recorded_by = her); 404 payment_not_found otherwise (no existence leak). */
  async ownViews(paymentId: string, userId: string): Promise<PaymentAttachmentView[]> {
    const row = await this.payments.get(paymentId);
    if (!row || row.recorded_by !== userId) throw notFound('payment_not_found');
    return this.views(row);
  }

  /** Read before the payment is deleted (its rows cascade). */
  async paths(paymentId: string): Promise<string[]> {
    return (await this.rows.forPayment(paymentId)).map((r) => r.path);
  }

  /** Best effort: an orphaned object is harmless once its payment is gone. */
  async discard(paths: readonly string[]): Promise<void> {
    await Promise.all(paths.map((path) => this.storage.remove({ bucket: BUCKETS.receipts, path }).catch(() => undefined)));
  }

  private async checkOne(path: string): Promise<CheckedAttachment> {
    const ref = { bucket: BUCKETS.receipts, path };
    const info = await this.storage.info(ref);
    if (!info) throw badRequest('attachment_path', { path });
    const mime = sniffMime((await this.storage.head(ref, SNIFF_BYTES)) ?? new Uint8Array());
    if (!mime || !MIMES.has(mime)) throw badRequest('attachment_type', { path });
    return { path, mime, size: info.size > 0 ? info.size : null };
  }
}
