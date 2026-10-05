import { PAYOUT_CORRECTIONS, type PayoutView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../scheduling/errors';
import { CorrectionsQueries } from '../teacher-earnings/corrections.queries';
import { EarningsQueries } from '../teacher-earnings/earnings.queries';
import { toPayoutView } from './payouts.mapper';
import { PayoutsQueries, type PayoutRow } from './payouts.queries';

/**
 * Keeps the monthly statement and the per-session ledger (docs/11 §12) from counting a lesson twice.
 * Rule: the ledger is the record of what was paid. Paying settles it in the same transaction
 * (PayoutsPayment); un-paying voids that settlement payment; reopening sends an approved payout
 * back to draft. A payout that is still open shows `ledger_paid`, the part of it the ledger has
 * already covered (per-session payments).
 */
@Injectable()
export class PayoutsLedger {
  constructor(
    private readonly payouts: PayoutsQueries,
    private readonly earnings: EarningsQueries,
    private readonly corrections: CorrectionsQueries,
  ) {}

  /** paid → approved: its settlement payment is voided (sessions owed again), audited in the RPC. */
  async unpay(id: string, input: { reason: string; actorId: string }): Promise<PayoutView> {
    const row = await this.row(id);
    if (PAYOUT_CORRECTIONS[row.status] !== 'approved') throw conflict('invalid_transition', { from: row.status });
    await this.corrections.unpayPayout({ payoutId: id, actorId: input.actorId, reason: input.reason });
    return this.view(id);
  }

  /** approved → draft (only while not paid): calculate again, then approve again. */
  async reopen(id: string, actorId: string): Promise<PayoutView> {
    const row = await this.row(id);
    if (PAYOUT_CORRECTIONS[row.status] !== 'draft') throw conflict('invalid_transition', { from: row.status });
    await this.corrections.reopenPayout({ payoutId: id, actorId });
    return this.view(id);
  }

  /** `ledger_paid` on every payout not yet paid (a paid one is settled whole). */
  async annotate(views: PayoutView[]): Promise<PayoutView[]> {
    return Promise.all(
      views.map(async (v) =>
        v.status === 'paid' ? v : { ...v, ledger_paid: await this.earnings.paidOnLessons(v.breakdown.lesson_ids) },
      ),
    );
  }

  private async view(id: string): Promise<PayoutView> {
    const [view] = await this.annotate([toPayoutView(await this.row(id))]);
    if (!view) throw notFound('payout_not_found');
    return view;
  }

  private async row(id: string): Promise<PayoutRow> {
    const row = await this.payouts.get(id);
    if (!row) throw notFound('payout_not_found');
    return row;
  }
}
