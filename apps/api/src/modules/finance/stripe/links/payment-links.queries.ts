import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

export type LinkRow = Tables<'payment_links'> & { student: { id: string; code: string | null; name: string } | null };
const SELECT = '*, student:students(id, code, name)';

const fail = (what: string, message: string): Error => new Error(`payment_links ${what} failed: ${message}`);

/** payment_links with the service role (the API is its only writer; RLS keeps clients to their own rows). */
@Injectable()
export class PaymentLinksQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(row: TablesInsert<'payment_links'>): Promise<LinkRow> {
    const { data, error } = await this.db.from('payment_links').insert(row).select(SELECT).single();
    if (error) throw fail('insert', error.message);
    return data;
  }

  async byRequest(clientRequestId: string): Promise<LinkRow | null> {
    return this.one('client_request_id', clientRequestId);
  }

  async get(id: string): Promise<LinkRow | null> {
    return this.one('id', id);
  }

  async byToken(token: string): Promise<LinkRow | null> {
    return this.one('token', token);
  }

  async byPaymentIntent(paymentIntent: string): Promise<LinkRow | null> {
    return this.one('stripe_payment_intent', paymentIntent);
  }

  /** Newest first; createdBy null = every link (an admin). At most 200. */
  async list(f: { createdBy: string | null }): Promise<LinkRow[]> {
    let q = this.db.from('payment_links').select(SELECT).order('created_at', { ascending: false }).limit(200);
    if (f.createdBy) q = q.eq('created_by', f.createdBy);
    const { data, error } = await q;
    if (error) throw fail('list', error.message);
    return data;
  }

  /** open → cancelled, only while still open; null when it was not. */
  async cancel(id: string): Promise<LinkRow | null> {
    return this.change(id, { status: 'cancelled' }, (q) => q.eq('status', 'open'));
  }

  /** Compare-and-set of the Checkout Session (null clears it): false when another request changed it first. */
  async setSession(input: { id: string; prev: string | null; session: string | null }): Promise<boolean> {
    let q = this.db.from('payment_links').update({ stripe_session_id: input.session, updated_at: now() }).eq('id', input.id);
    q = input.prev === null ? q.is('stripe_session_id', null) : q.eq('stripe_session_id', input.prev);
    const { data, error } = await q.select('id');
    if (error) throw fail('session', error.message);
    return data.length > 0;
  }

  async setProcessing(id: string, processing: boolean): Promise<void> {
    await this.change(id, { processing });
  }

  /** The paid link (whatever its status was: the money is real, a late payment of an expired link included). */
  async markPaid(id: string, paid: { paymentId: string; paidAt: string; paymentIntent: string | null }): Promise<void> {
    const patch = { status: 'paid', processing: false, paid_payment_id: paid.paymentId, paid_at: paid.paidAt };
    await this.change(id, paid.paymentIntent ? { ...patch, stripe_payment_intent: paid.paymentIntent } : patch);
  }

  /** The student's brought_by, and whether they already have a priced package (a renewal needs one). */
  async student(id: string): Promise<{ broughtBy: string | null; priced: boolean } | null> {
    const { data, error } = await this.db.from('students').select('brought_by, subscriptions(price)').eq('id', id).maybeSingle();
    if (error) throw fail('student', error.message);
    if (!data) return null;
    return { broughtBy: data.brought_by, priced: data.subscriptions.some((s) => s.price > 0) };
  }

  /** set_student_brought_by (migration 751): the attribution the first-package commission needs. */
  async attribute(input: { studentId: string; assistantId: string; broughtAt: string }): Promise<void> {
    const args = { p_student: input.studentId, p_assistant: input.assistantId, p_actor: input.assistantId, p_brought_at: input.broughtAt };
    const { error } = await this.db.rpc('set_student_brought_by', args);
    if (error) throw fail('attribute', error.message);
  }

  private async one(column: 'id' | 'token' | 'client_request_id' | 'stripe_payment_intent', value: string): Promise<LinkRow | null> {
    const { data, error } = await this.db.from('payment_links').select(SELECT).eq(column, value).maybeSingle();
    if (error) throw fail('read', error.message);
    return data;
  }

  private async change(id: string, patch: Partial<Tables<'payment_links'>>, where?: (q: Filter) => Filter): Promise<LinkRow | null> {
    const base = this.db.from('payment_links').update({ ...patch, updated_at: now() }).eq('id', id);
    const { data, error } = await (where ? where(base) : base).select(SELECT).maybeSingle();
    if (error) throw fail('update', error.message);
    return data;
  }
}

type Filter = ReturnType<ReturnType<Db['from']>['update']>;
const now = (): string => new Date().toISOString();
