import type { PaymentMethod } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest } from '../scheduling/errors';
import { PaymentAttachments, type CheckedAttachment } from './payment-attachments.service';
import { ReceiptsService } from './receipts.service';

type FilesInput = { method: PaymentMethod; receiptPath?: string | null | undefined; attachments?: readonly string[] | undefined };

/** The files of a payment: the single receipt (older forms) and «المرفقات» (bank transfers only). */
@Injectable()
export class PaymentFiles {
  constructor(
    readonly receipts: ReceiptsService,
    readonly attachments: PaymentAttachments,
  ) {}

  /** Before any insert: 400 attachments_not_allowed (not a bank transfer), receipt_path, attachment_path / _type. */
  async check(subscriptionId: string, input: FilesInput): Promise<CheckedAttachment[]> {
    const paths = input.attachments ?? [];
    if (paths.length > 0 && input.method !== 'bank') throw badRequest('attachments_not_allowed');
    if (input.receiptPath) await this.receipts.check(subscriptionId, input.receiptPath);
    return this.attachments.check(subscriptionId, paths);
  }
}
