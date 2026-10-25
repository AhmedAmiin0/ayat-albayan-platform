import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { netPaid, type PaymentKind } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { applySort } from '../../common/list-sort';
import type { StudentRef } from '../subscriptions/subscriptions.queries';
import { readAll } from '../scheduling/read-all';
import { badRequest } from '../../common/http/errors';
import { dbError, type Page } from '../../common/http/http';
import { filtered, PAYMENT_SORT, type PaymentFilter } from './payments.list-query';

export type { PaymentFilter } from './payments.list-query';

export type PaymentRow = Tables<'payments'> & {
  subscription: { student_id: string; currency: string; student: StudentRef | null } | null;
};
export type PeriodTotal = { currency: string; net: number; payments: number; refunds: number };
export type PaymentSubscription = { id: string; student_id: string; currency: string };

const SELECT = '*, subscription:subscriptions!inner(student_id, currency, student:students(id, code, name))';

/** All supabase access for `payments` (service role; admin-only routes). R-PAY-01. */
@Injectable()
export class PaymentsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: PaymentFilter): Promise<Page<PaymentRow>> {
    const from = (f.page - 1) * f.pageSize;
    const query = filtered(this.db.from('payments').select(SELECT, { count: 'exact' }), f);
    const { data, count, error } = await applySort(query, f, PAYMENT_SORT)
      .order('id')
      .range(from, from + f.pageSize - 1);
    if (error) throw dbError(error);
    return { items: data, total: count ?? 0, page: f.page, pageSize: f.pageSize };
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
    if (error) throw dbError(error);
    return netPaid(data.map((r) => ({ amount: Number(r.amount), kind: r.kind })));
  }

  async get(id: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db.from('payments').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** null: a payment with this client_request_id is already recorded (a retry raced it). */
  async insert(row: TablesInsert<'payments'>): Promise<PaymentRow | null> {
    const { data, error } = await this.db.from('payments').insert(row).select(SELECT).single();
    if (error?.code === '23505' && error.message.includes('client_request_id')) return null;
    if (error) throw dbError(error);
    return data;
  }

  /** The payment a form already recorded (its client_request_id), or null. */
  async byRequest(clientRequestId: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db
      .from('payments')
      .select(SELECT)
      .eq('client_request_id', clientRequestId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The payment already recorded from this invoice («سجّل كدفعة» once), or null. */
  async byInvoice(invoiceId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.db.from('payments').select('id').eq('invoice_id', invoiceId).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'payments'>): Promise<PaymentRow> {
    const { data, error } = await this.db.from('payments').update(patch).eq('id', id).select(SELECT).single();
    // The backstop of migration 432: a payment with «المرفقات» stays a bank transfer.
    if (error?.code === '23514' && error.message.includes('attachments')) throw badRequest('attachments_not_allowed');
    if (error) throw dbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('payments').delete().eq('id', id);
    if (error) throw dbError(error);
  }

  async subscription(id: string): Promise<PaymentSubscription | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, student_id, currency')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** auth user id → profiles.full_name («سجّلها {name}»). */
  async recorders(ids: readonly (string | null)[]): Promise<Map<string, string>> {
    const wanted = [...new Set(ids.filter((id) => id !== null))];
    if (wanted.length === 0) return new Map();
    const { data, error } = await this.db.from('profiles').select('id, full_name').in('id', wanted);
    if (error) throw dbError(error);
    return new Map(data.map((p) => [p.id, p.full_name]));
  }
}
