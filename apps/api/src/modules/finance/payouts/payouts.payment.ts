import type { SignedDownload } from '@ab/shared';
import { canTransitionPayout, type PayoutPay, type PayoutView } from '@ab/money';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { CorrectionsRepo } from '@/modules/finance/teacher-earnings/summary/corrections.repo';
import { EarningsReceipts } from '@/modules/finance/teacher-earnings/earnings.receipts';
import { toPayoutView } from './payouts.mapper';
import { PayoutsRepo, type PayoutRow } from './payouts.repo';

/** Y4: settlement and the move to paid in one transaction (migration 20261005000201). */
@Injectable()
export class PayoutsPayment {
  constructor(
    private readonly payouts: PayoutsRepo,
    private readonly corrections: CorrectionsRepo,
    private readonly receipts: EarningsReceipts,
  ) {}

  async pay(id: string, body: PayoutPay, actorId: string): Promise<PayoutView> {
    const row = await this.row(id);
    if (!canTransitionPayout(row.status, 'paid')) throw conflict('invalid_transition', { from: row.status });
    if (body.receiptPath) await this.receipts.check(row.teacher_id, body.receiptPath);
    await this.corrections.payPayout({
      payoutId: id,
      actorId,
      paidAt: body.paidAt ?? new Date().toISOString(),
      method: body.method ?? null,
      note: body.note ?? null,
      receiptPath: body.receiptPath ?? null,
    });
    return toPayoutView(await this.row(id));
  }

  async receipt(id: string): Promise<SignedDownload> {
    return this.receipts.download((await this.row(id)).receipt_path);
  }

  private async row(id: string): Promise<PayoutRow> {
    const row = await this.payouts.get(id);
    if (!row) throw notFound('payout_not_found');
    return row;
  }
}
