import type { Json } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import { ledgerError } from '../earnings.errors';

export type PayPayoutInput = {
  payoutId: string;
  actorId: string;
  paidAt: string;
  method: string | null;
  note: string | null;
  receiptPath: string | null;
};
export type SummaryRow = {
  teacher_id: string;
  display_name_ar: string;
  sessions: number;
  earned: number;
  paid: number;
  owed: number;
  unpaid_sessions: number;
  oldest_unpaid_at: string | null;
};

/**
 * The correction RPCs of migration 20261005000201 (each one transaction with its audit row) and
 * the «مستحقات المعلمين» summary view (20261005000202). Service role; the controllers guard.
 */
@Injectable()
export class CorrectionsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async voidPayment(input: { paymentId: string; actorId: string; reason: string }): Promise<void> {
    const { error } = await this.db.rpc('void_teacher_payment', {
      p_payment: input.paymentId,
      p_actor: input.actorId,
      p_reason: input.reason,
    });
    if (error) throw ledgerError(error);
  }

  /** Ledger settlement + payout → paid in one transaction. */
  async payPayout(input: PayPayoutInput): Promise<void> {
    const p: Json = { paid_at: input.paidAt, method: input.method, note: input.note, receipt_path: input.receiptPath };
    const { error } = await this.db.rpc('pay_payout', { p_payout: input.payoutId, p_actor: input.actorId, p });
    if (error) throw ledgerError(error);
  }

  async unpayPayout(input: { payoutId: string; actorId: string; reason: string }): Promise<void> {
    const { error } = await this.db.rpc('unpay_payout', {
      p_payout: input.payoutId,
      p_actor: input.actorId,
      p_reason: input.reason,
    });
    if (error) throw ledgerError(error);
  }

  async reopenPayout(input: { payoutId: string; actorId: string }): Promise<void> {
    const { error } = await this.db.rpc('reopen_payout', { p_payout: input.payoutId, p_actor: input.actorId });
    if (error) throw ledgerError(error);
  }

  /** One row per teacher with ledger sessions (few rows: one per teacher). */
  async summary(): Promise<SummaryRow[]> {
    const { data, error } = await this.db
      .from('v_teacher_earnings_summary')
      .select('*')
      .order('owed', { ascending: false })
      .order('display_name_ar');
    if (error) throw dbError(error);
    return data;
  }
}
