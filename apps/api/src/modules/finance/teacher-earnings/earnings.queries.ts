import type { Json, Tables } from '@ab/db';
import type { EarningsListQuery, TeacherPaymentListQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError, type Page } from '../../../common/http/http';
import { ledgerError } from './earnings.errors';
import { paymentsPage, sessionsPage } from './summary/earnings.lists';

export type EarningRow = Tables<'teacher_session_earnings'>;
export type SessionRow = EarningRow & {
  lesson: { lesson_students: { student: { name: string } | null }[] } | null;
};
export type PaymentRow = Tables<'teacher_payments'> & { items: { earning_id: string }[] };
export type MoneyRow = Pick<EarningRow, 'id' | 'amount' | 'paid_amount'>;
export type RecordResult = { payment_id: string; replayed: boolean };
export type SessionFilter = EarningsListQuery;

// Reads (balance, sessions, allocation) go through the view of migration 183: only sessions of
// subscribed students (not trial, a student with status 'active'). The table is only written by the DB.
const COUNTABLE = 'v_teacher_countable_earnings';
const PAYMENT = '*, items:teacher_payment_items(earning_id)';
const CHUNK = 1000; // PostgREST max-rows
const STATUSES = { unpaid: ['earned', 'partially_paid'] } as const;

/** All supabase access for the per-session ledger (service role; the controllers guard). */
@Injectable()
export class EarningsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teacher(id: string): Promise<{ id: string; display_name_ar: string } | null> {
    const { data, error } = await this.db.from('teachers').select('id, display_name_ar').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Every earning's money (the balance cards), read in pages of 1000. */
  async money(teacherId: string): Promise<MoneyRow[]> {
    const rows: MoneyRow[] = [];
    for (let from = 0; ; from += CHUNK) {
      const { data, error } = await this.db
        .from(COUNTABLE)
        .select('id, amount, paid_amount')
        .eq('teacher_id', teacherId)
        .order('starts_at')
        .order('id')
        .range(from, from + CHUNK - 1)
        .returns<MoneyRow[]>();
      if (error) throw dbError(error);
      rows.push(...data);
      if (data.length < CHUNK) return rows;
    }
  }

  async sessions(teacherId: string, f: SessionFilter): Promise<Page<SessionRow>> {
    return sessionsPage(this.db, { teacherId, filter: f });
  }

  /** The teacher's own earnings among `ids`, or all of those with something outstanding. */
  async forPayment(teacherId: string, ids: readonly string[] | undefined): Promise<EarningRow[]> {
    let q = this.db.from(COUNTABLE).select('*').eq('teacher_id', teacherId);
    q = ids ? q.in('id', [...ids]) : q.in('status', [...STATUSES.unpaid]);
    const { data, error } = await q.order('starts_at').order('id').limit(CHUNK).returns<EarningRow[]>();
    if (error) throw dbError(error);
    return data;
  }

  async payments(teacherId: string, f: TeacherPaymentListQuery): Promise<Page<PaymentRow>> {
    return paymentsPage(this.db, { teacherId, filter: f });
  }

  async payment(id: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db.from('teacher_payments').select(PAYMENT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byRequest(clientRequestId: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db
      .from('teacher_payments')
      .select(PAYMENT)
      .eq('client_request_id', clientRequestId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** record_teacher_payment (migration 178): the payment, its items and the earnings in one transaction. */
  async record(payload: Json): Promise<RecordResult> {
    const { data, error } = await this.db.rpc('record_teacher_payment', { p: payload });
    if (error) throw ledgerError(error);
    const r = data as { payment_id: string; replayed: boolean };
    return { payment_id: r.payment_id, replayed: r.replayed };
  }

  /** settle_payout_in_ledger: the payment id, or null when nothing was outstanding. */
  async settlePayout(input: { payoutId: string; actorId: string; paidAt: string }): Promise<string | null> {
    const { data, error } = await this.db.rpc('settle_payout_in_ledger', {
      p_payout: input.payoutId,
      p_actor: input.actorId,
      p_paid_at: input.paidAt,
    });
    if (error) throw ledgerError(error);
    return data;
  }

  /** resync_teacher_earnings: lessons examined. */
  async resync(teacherId: string | undefined): Promise<number> {
    const { data, error } = await this.db.rpc('resync_teacher_earnings', { p_teacher: teacherId });
    if (error) throw ledgerError(error);
    return data;
  }

  /** Paid so far on these lessons (the monthly statement shows what the ledger already covered). */
  async paidOnLessons(lessonIds: readonly string[]): Promise<number> {
    let cents = 0;
    for (let i = 0; i < lessonIds.length; i += 100) {
      const { data, error } = await this.db
        .from('teacher_session_earnings')
        .select('paid_amount')
        .in('lesson_id', lessonIds.slice(i, i + 100));
      if (error) throw dbError(error);
      cents += data.reduce((n, r) => n + Math.round(r.paid_amount * 100), 0);
    }
    return cents / 100;
  }
}
