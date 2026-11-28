import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { PaymentKind, SubscriptionStatus } from '@ab/catalog';
import { netPaid } from '@ab/money';
import { type HttpException, Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readPage, toPage } from '@/common/db/page';
import type { StudentRef } from '@/modules/finance/subscriptions/shared/subscriptions.repo';
import { readAll } from '@/common/db/read-all';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { done, maybe, pgError, uniqueViolationMentions } from '@/common/db/errors';
import { filtered, PAYMENT_SORT, type PaymentFilter } from './payments.list-query';
import type { Page } from '@ab/core';
import type { PeriodTotal } from '@ab/money';

export type { PaymentFilter } from './payments.list-query';

export type PaymentRow = Tables<'payments'> & {
  subscription: { student_id: string; currency: string; status: SubscriptionStatus; cancel_kind: string | null; student: StudentRef | null } | null;
};
export interface PaymentSubscription { id: string; student_id: string; currency: string; status: SubscriptionStatus; cancel_kind: string | null }

/** payment_amount_set's refusals (P0001): net below 0, a concurrent edit won, or deleted since. */
const AMOUNT_REFUSALS: Record<string, (code: string) => HttpException> = {
  refund_exceeds_paid: conflict,
  payment_amount_changed: conflict,
  payment_not_found: notFound,
};

const SELECT = '*, subscription:subscriptions!inner(student_id, currency, status, cancel_kind, student:students(id, code, name))';

/** All supabase access for `payments` (service role; admin-only routes). R-PAY-01. */
@Injectable()
export class PaymentsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: PaymentFilter): Promise<Page<PaymentRow>> {
    const query = () => filtered(this.db.from('payments').select(SELECT, { count: 'exact' }), f);
    const read = await readPage(query, f, PAYMENT_SORT);
    return toPage(read.rows, read.total, f);
  }

  /** The filter's totals per currency (net = payments − refunds), for the period line on the page. */
  async totals(f: PaymentFilter): Promise<PeriodTotal[]> {
    const rows = await readAll((a, b) =>
      filtered(this.db.from('payments').select('id, amount, currency, kind, subscription:subscriptions!inner(student_id)'), f)
        .order('id')
        .range(a, b),
    );
    const by = new Map<string, { amount: number; kind: PaymentKind }[]>();
    for (const r of rows) by.set(r.currency, [...(by.get(r.currency) ?? []), { amount: Number(r.amount), kind: r.kind }]);
    return [...by.entries()].sort().map(([currency, list]) => ({
      currency,
      net: netPaid(list),
      payments: netPaid(list.filter((r) => r.kind === 'payment')),
      refunds: netPaid(list.filter((r) => r.kind === 'refund').map((r) => ({ ...r, kind: 'payment' as const }))),
    }));
  }

  /** Net paid on one package (payments − refunds): a refund may not take it below zero. */
  async netPaid(subscriptionId: string): Promise<number> {
    const { data, error } = await this.db.from('payments').select('amount, kind').eq('subscription_id', subscriptionId);
    if (error) throw pgError(error);
    return netPaid(data.map((r) => ({ amount: Number(r.amount), kind: r.kind })));
  }

  async get(id: string): Promise<PaymentRow | null> {
    const data = maybe(await this.db.from('payments').select(SELECT).eq('id', id).maybeSingle());
    return data;
  }

  /** null: a payment with this client_request_id is already recorded (a retry raced it). */
  async insert(row: TablesInsert<'payments'>): Promise<PaymentRow | null> {
    const { data, error } = await this.db.from('payments').insert(row).select(SELECT).single();
    if (uniqueViolationMentions(error, 'client_request_id')) return null;
    if (error) throw pgError(error);
    return data;
  }

  /** The payment a form already recorded (its client_request_id), or null. */
  async byRequest(clientRequestId: string): Promise<PaymentRow | null> {
    const data = maybe(await this.db
      .from('payments')
      .select(SELECT)
      .eq('client_request_id', clientRequestId)
      .maybeSingle());
    return data;
  }

  /** The payment already recorded from this invoice (recorded once), or null. */
  async byInvoice(invoiceId: string): Promise<{ id: string } | null> {
    const data = maybe(await this.db.from('payments').select('id').eq('invoice_id', invoiceId).maybeSingle());
    return data;
  }

  async update(id: string, patch: TablesUpdate<'payments'>): Promise<PaymentRow> {
    const { data, error } = await this.db.from('payments').update(patch).eq('id', id).select(SELECT).single();
    // The backstop of migration 432: a payment with attachments stays a bank transfer.
    if (error?.code === '23514' && error.message.includes('attachments')) throw badRequest('attachments_not_allowed');
    if (error) throw pgError(error);
    return data;
  }

  /** Checked and written under a lock (payment_amount_set): 409 on a lost race. */
  async setAmount(id: string, change: { amount: number; expected: number }): Promise<PaymentRow> {
    const args = { p_payment: id, p_amount: change.amount, p_expected: change.expected };
    const { error } = await this.db.rpc('payment_amount_set', args);
    const refusal = Object.entries(AMOUNT_REFUSALS).find(([c]) => error?.message.includes(c));
    if (refusal) throw refusal[1](refusal[0]);
    if (error) throw pgError(error);
    const read = await this.db.from('payments').select(SELECT).eq('id', id).single();
    if (read.error) throw pgError(read.error);
    return read.data;
  }

  async remove(id: string): Promise<void> {
    done(await this.db.from('payments').delete().eq('id', id));
  }

  async subscription(id: string): Promise<PaymentSubscription | null> {
    const data = maybe(await this.db
      .from('subscriptions')
      .select('id, student_id, currency, status, cancel_kind')
      .eq('id', id)
      .maybeSingle());
    return data;
  }

  async recorders(ids: readonly (string | null)[]): Promise<Map<string, string>> {
    const wanted = [...new Set(ids.filter((id) => id !== null))];
    if (wanted.length === 0) return new Map();
    const { data, error } = await this.db.from('profiles').select('id, full_name').in('id', wanted);
    if (error) throw pgError(error);
    return new Map(data.map((p) => [p.id, p.full_name]));
  }
}
