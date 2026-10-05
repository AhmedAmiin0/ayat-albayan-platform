import { canTransitionPayout, type PayoutPay, type PayoutView, type SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../scheduling/errors';
import { CorrectionsQueries } from '../teacher-earnings/corrections.queries';
import { EarningsReceipts } from '../teacher-earnings/earnings.receipts';
import { toPayoutView } from './payouts.mapper';
import { PayoutsQueries, type PayoutRow } from './payouts.queries';

/**
 * «تم الدفع» (Y4): the ledger settlement AND the payout's move to paid in ONE transaction
 * (pay_payout, migration 20261005000201), with the transfer's date, method, note and receipt
 * (receipts/{teacher_id}/…, uploaded through POST /teacher-earnings/:teacherId/receipt-upload-url).
 */
@Injectable()
export class PayoutsPayment {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly corrections: CorrectionsQueries,
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

  /** The receipt uploaded with «تم الدفع»; none → 404 receipt_not_found. */
  async receipt(id: string): Promise<SignedDownload> {
    return this.receipts.download((await this.row(id)).receipt_path);
  }

  private async row(id: string): Promise<PayoutRow> {
    const row = await this.payouts.get(id);
    if (!row) throw notFound('payout_not_found');
    return row;
  }
}
