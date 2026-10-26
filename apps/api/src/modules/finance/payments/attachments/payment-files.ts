import { PAYMENT_ATTACHMENTS_MAX, type PaymentMethod } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { badRequest } from '../../../../common/http/errors';
import { PaymentAttachments, type CheckedAttachment } from './payment-attachments.service';
import { ReceiptsService } from './receipts.service';

type FilesInput = { method: PaymentMethod; receiptPath?: string | null | undefined; attachments?: readonly string[] | undefined };
/** The booked row a late save lands on: its method and count rule, never the form's. */
type BookedRow = { id: string; subscription_id: string; method: PaymentMethod };
type LateInput = { subscriptionId: string; attachments?: readonly string[] | undefined };

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The files of a payment: the single receipt (older forms) and «المرفقات» (bank transfers only). */
@Injectable()
export class PaymentFiles {
  private readonly log = new Logger(PaymentFiles.name);

  constructor(
    readonly receipts: ReceiptsService,
    readonly attachments: PaymentAttachments,
  ) {}

  /** Before any insert: 400 attachments_not_allowed (not a bank transfer), receipt_path, attachment_path / _type; 409 attachment_in_use. */
  async check(subscriptionId: string, input: FilesInput): Promise<CheckedAttachment[]> {
    const paths = input.attachments ?? [];
    if (paths.length > 0 && input.method !== 'bank') throw badRequest('attachments_not_allowed');
    if (input.receiptPath) await this.receipts.check({ subscriptionId, path: input.receiptPath });
    return this.attachments.check({ subscriptionId, paths });
  }

  /** PATCH: a new receipt (the payment's own path is fine); a payment with «المرفقات» stays a bank transfer (400). */
  async checkPatch(row: { id: string; subscription_id: string }, patch: { receiptPath?: string | null | undefined; method?: PaymentMethod | undefined }): Promise<void> {
    if (patch.receiptPath) await this.receipts.check({ subscriptionId: row.subscription_id, path: patch.receiptPath, paymentId: row.id });
    if (patch.method === undefined || patch.method === 'bank') return;
    if ((await this.attachments.paths(row.id)).length > 0) throw badRequest('attachments_not_allowed');
  }

  /** After the payment is booked (rule 8): a booked payment must never come back as an error, so a failure is logged. */
  async saveBooked(paymentId: string, files: readonly CheckedAttachment[], actorId: string): Promise<void> {
    try {
      await this.attachments.save(paymentId, files, actorId);
    } catch (e) {
      this.log.error(`payment ${paymentId}: attachments not saved (${reason(e)})`);
    }
  }

  /**
   * A replay or a race loser: the form's files a failure after the insert lost, best effort and never an
   * error. Only on the same package, only on a bank row (the STORED method), only paths not stored yet (a
   * lost-reply replay does no storage I/O), at most PAYMENT_ATTACHMENTS_MAX in all; a path whose check fails
   * is logged and skipped, never saved. The stored receipt is never re-checked.
   */
  async saveLate(row: BookedRow, input: LateInput, actorId: string): Promise<void> {
    const sent = [...new Set(input.attachments ?? [])];
    if (sent.length === 0 || row.subscription_id !== input.subscriptionId) return;
    try {
      if (row.method !== 'bank') return this.log.warn(`payment ${row.id}: ${row.method} payment, replayed files dropped`);
      const stored = new Set(await this.attachments.paths(row.id));
      const fresh = sent.filter((p) => !stored.has(p));
      if (fresh.length === 0) return;
      const kept = fresh.slice(0, Math.max(0, PAYMENT_ATTACHMENTS_MAX - stored.size));
      if (kept.length < fresh.length) this.log.warn(`payment ${row.id}: ${fresh.length - kept.length} file(s) over the limit dropped`);
      const files = await this.checked(row, kept);
      await this.attachments.save(row.id, files, actorId);
    } catch (e) {
      this.log.error(`payment ${row.id}: replayed attachments not saved (${reason(e)})`);
    }
  }

  /** Each path on its own: a failing one is logged and left out. */
  private async checked(row: BookedRow, paths: readonly string[]): Promise<CheckedAttachment[]> {
    const results = await Promise.allSettled(
      paths.map((path) => this.attachments.check({ subscriptionId: row.subscription_id, paths: [path], paymentId: row.id })),
    );
    return results.flatMap((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      this.log.warn(`payment ${row.id}: attachment ${paths[i] ?? ''} skipped (${reason(r.reason)})`);
      return [];
    });
  }
}
