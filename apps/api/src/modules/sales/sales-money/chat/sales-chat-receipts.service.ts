import type { SalesChatReceipt, SalesChatReceiptCopy, SalesChatReceiptFile, SalesReceiptCopied } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { SalesChatFiles } from './sales-chat-files';
import { SalesMoneyScope } from '../sales-money.scope';
import { SalesMoneyServices } from '../sales-money.services';

/**
 * «اختر صورة الإيصال من المحادثة» (owner 2026-10-12, docs/16 row 18): the receipt the family sent in its
 * chat, for a student she owns only (403 not_your_student; with sales.renew_any ANY student, still only the
 * files of that student's own family chat), never a general inbox.media grant.
 */
@Injectable()
export class SalesChatReceipts {
  constructor(
    private readonly scope: SalesMoneyScope,
    private readonly services: SalesMoneyServices,
    private readonly files: SalesChatFiles,
  ) {}

  async list(query: { studentId: string; phone?: string | undefined }, user: AuthUser): Promise<SalesChatReceipt[]> {
    return this.files.list(await this.scope.familyChat(user, query.studentId, query.phone));
  }

  async file(input: { studentId: string; messageId: string; phone?: string | undefined }, user: AuthUser): Promise<SalesChatReceiptFile> {
    const phone = await this.scope.familyChat(user, input.studentId, input.phone);
    return this.files.sign({ phone, messageId: input.messageId });
  }

  /** The receipt path to send with POST /sales/payments (the package must be her student's). */
  async copy(input: SalesChatReceiptCopy, ctx: { user: AuthUser; maxBytes: number }): Promise<SalesReceiptCopied> {
    const sub = await this.services.receipts.subscription(input.subscriptionId);
    const phone = await this.scope.familyChat(ctx.user, sub.student_id, input.phone);
    const path = await this.files.copy({ phone, messageId: input.messageId, subscriptionId: sub.id, maxBytes: ctx.maxBytes });
    return { receipt_path: path };
  }
}
