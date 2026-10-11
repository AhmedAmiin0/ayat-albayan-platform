import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

type Sub = Tables<'subscriptions'>;
/** Whitelisted subscription columns: never price, currency, fx_*, price_source or notes. */
export type HistorySubscriptionRow = Pick<Sub, 'id' | 'package' | 'status' | 'starts_on' | 'renews_on' | 'lessons_total' | 'created_at'>;
export type HistoryBalanceRow = { subscription_id: string | null; lessons_used: number | null; remaining: number | null; ended_at: string | null };
/** A payment as date, kind, amount and currency (owner 2026-10-11): never method, receipt, fx or note. */
export type HistoryPaymentRow = Pick<Tables<'payments'>, 'id' | 'subscription_id' | 'paid_at' | 'kind' | 'amount' | 'currency'>;
/** An audit row reduced to its date and the status before / after (json paths, nothing else of the row). */
export type HistoryAuditRow = { entity_id: string; at: string; before_status: string | null; after_status: string | null };

export interface HistoryBundle {
  student: { id: string; code: string | null; name: string };
  subscriptions: HistorySubscriptionRow[];
  balances: HistoryBalanceRow[];
  payments: HistoryPaymentRow[];
  audit: HistoryAuditRow[];
}

/** GET /sales/subscriptions/:id/history reads (service role; SalesAcademyService checks the ownership first). */
@Injectable()
export class SalesHistoryQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The subscription's student, or null for an unknown id. */
  async studentOf(subscriptionId: string): Promise<string | null> {
    const { data, error } = await this.db.from('subscriptions').select('student_id').eq('id', subscriptionId).maybeSingle();
    if (error) throw dbError(error);
    return data?.student_id ?? null;
  }

  async history(studentId: string): Promise<HistoryBundle | null> {
    const [student, subs] = await Promise.all([
      this.db.from('students').select('id, code, name').eq('id', studentId).maybeSingle(),
      this.db
        .from('subscriptions')
        .select('id, package, status, starts_on, renews_on, lessons_total, created_at')
        .eq('student_id', studentId)
        .order('starts_on')
        .order('created_at'),
    ]);
    if (student.error) throw dbError(student.error);
    if (subs.error) throw dbError(subs.error);
    if (!student.data) return null;
    const ids = subs.data.map((s) => s.id);
    if (ids.length === 0) return { student: student.data, subscriptions: [], balances: [], payments: [], audit: [] };
    const [balances, payments, audit] = await Promise.all([
      this.db.from('v_subscription_balance').select('subscription_id, lessons_used, remaining, ended_at').in('subscription_id', ids),
      this.db.from('payments').select('id, subscription_id, paid_at, kind, amount, currency').in('subscription_id', ids).order('paid_at'),
      this.db
        .from('audit_log')
        .select('entity_id, at, before_status:before->>status, after_status:after->>status')
        .eq('entity', 'subscriptions')
        .in('entity_id', ids)
        .order('at')
        .overrideTypes<HistoryAuditRow[], { merge: false }>(),
    ]);
    for (const r of [balances, payments, audit]) if (r.error) throw dbError(r.error);
    return { student: student.data, subscriptions: subs.data, balances: balances.data ?? [], payments: payments.data ?? [], audit: audit.data ?? [] };
  }
}
