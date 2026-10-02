import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { StudentRef } from '../subscriptions/subscriptions.queries';
import { dbError, type Page, type PageQuery } from '../teachers/http';

export type PaymentRow = Tables<'payments'> & {
  subscription: { student_id: string; currency: string; student: StudentRef | null } | null;
};
export type PaymentFilter = PageQuery & {
  subscriptionId?: string;
  studentId?: string;
  /** ISO instants, half-open [from, to). */
  from?: string;
  to?: string;
};
export type PaymentSubscription = { id: string; student_id: string; currency: string };

const SELECT = '*, subscription:subscriptions!inner(student_id, currency, student:students(id, code, name))';

/** All supabase access for `payments` (service role; admin-only routes). R-PAY-01. */
@Injectable()
export class PaymentsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: PaymentFilter): Promise<Page<PaymentRow>> {
    const from = (f.page - 1) * f.pageSize;
    let q = this.db.from('payments').select(SELECT, { count: 'exact' });
    if (f.subscriptionId) q = q.eq('subscription_id', f.subscriptionId);
    if (f.studentId) q = q.eq('subscription.student_id', f.studentId);
    if (f.from) q = q.gte('paid_at', f.from);
    if (f.to) q = q.lt('paid_at', f.to);
    const { data, count, error } = await q
      .order('paid_at', { ascending: false })
      .order('id')
      .range(from, from + f.pageSize - 1);
    if (error) throw dbError(error);
    return { items: data, total: count ?? 0, page: f.page, pageSize: f.pageSize };
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

  async update(id: string, patch: TablesUpdate<'payments'>): Promise<PaymentRow> {
    const { data, error } = await this.db.from('payments').update(patch).eq('id', id).select(SELECT).single();
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
