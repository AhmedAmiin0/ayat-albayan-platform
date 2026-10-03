import { canTransitionPayout, type PayoutPay, type PayoutView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../scheduling/errors';
import { EarningsQueries } from '../teacher-earnings/earnings.queries';
import { PayoutsQueries } from './payouts.queries';
import { PayoutsService } from './payouts.service';

/**
 * Keeps the monthly statement and the per-session ledger (docs/11 §10) from counting a lesson twice.
 * Rule: the ledger is the record of what was paid. Marking a payout paid first settles, in the
 * ledger, what is still outstanding on that payout's lessons (once, idempotent per payout), then
 * moves the payout to paid. Sessions already paid one by one are not paid again, and a payout
 * that is still open shows `ledger_paid`, the part of it the ledger has already covered.
 */
@Injectable()
export class PayoutsLedger {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly earnings: EarningsQueries,
    private readonly service: PayoutsService,
  ) {}

  async pay(id: string, body: PayoutPay, actorId: string): Promise<PayoutView> {
    const row = await this.payouts.get(id);
    if (!row) throw notFound('payout_not_found');
    if (!canTransitionPayout(row.status, 'paid')) throw conflict('invalid_transition', { from: row.status });
    const paidAt = body.paidAt ?? new Date().toISOString();
    await this.earnings.settlePayout({ payoutId: id, actorId, paidAt });
    return this.service.pay(id, { ...body, paidAt }, actorId);
  }

  /** `ledger_paid` on every payout not yet paid (a paid one is settled whole). */
  async annotate(views: PayoutView[]): Promise<PayoutView[]> {
    return Promise.all(
      views.map(async (v) =>
        v.status === 'paid' ? v : { ...v, ledger_paid: await this.earnings.paidOnLessons(v.breakdown.lesson_ids) },
      ),
    );
  }
}
