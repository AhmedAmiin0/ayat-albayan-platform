import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { SubscriptionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError, type Page, type PageQuery } from '../teachers/http';
import { readChunked } from '../scheduling/read-all';

export type StudentRef = { id: string; code: string | null; name: string };
export type SubRow = Tables<'subscriptions'> & { student: StudentRef | null };
export type SubListQuery = PageQuery & { status?: SubscriptionStatus; studentId?: string };

const SELECT = '*, student:students(id, code, name)';

/** All supabase access for `subscriptions` (service role; the controllers guard). R-SUB-01. */
@Injectable()
export class SubscriptionsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: SubListQuery): Promise<Page<SubRow>> {
    const from = (q.page - 1) * q.pageSize;
    let query = this.db.from('subscriptions').select(SELECT, { count: 'exact' });
    if (q.status) query = query.eq('status', q.status);
    if (q.studentId) query = query.eq('student_id', q.studentId);
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + q.pageSize - 1);
    if (error) throw dbError(error);
    return { items: data, total: count ?? 0, page: q.page, pageSize: q.pageSize };
  }

  async get(id: string): Promise<SubRow | null> {
    const { data, error } = await this.db.from('subscriptions').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** A student's packages in FIFO order (starts_on, created_at, id), as the balance view. */
  async forStudent(studentId: string): Promise<SubRow[]> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select(SELECT)
      .eq('student_id', studentId)
      .order('starts_on')
      .order('created_at')
      .order('id');
    if (error) throw dbError(error);
    return data;
  }

  /** Several students' packages (no join), FIFO order within each student. */
  async forStudents(studentIds: readonly string[]): Promise<Tables<'subscriptions'>[]> {
    return readChunked(studentIds, (chunk) =>
      this.db.from('subscriptions').select('*').in('student_id', chunk).order('starts_on').order('created_at').order('id'),
    );
  }

  async insert(row: TablesInsert<'subscriptions'>): Promise<SubRow> {
    const { data, error } = await this.db.from('subscriptions').insert(row).select(SELECT).single();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'subscriptions'>): Promise<SubRow | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .update(patch)
      .eq('id', id)
      .select(SELECT)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('subscriptions').delete().eq('id', id);
    if (error) throw dbError(error);
  }

  async hasPayments(id: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', id);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }

  /** Sum of each package's payments in its own currency (v1: the API refuses other currencies). */
  async paid(subs: readonly Pick<SubRow, 'id' | 'currency'>[]): Promise<Map<string, number>> {
    const sums = new Map(subs.map((s) => [s.id, 0]));
    if (subs.length === 0) return sums;
    const { data, error } = await this.db
      .from('payments')
      .select('subscription_id, amount, currency')
      .in('subscription_id', [...sums.keys()]);
    if (error) throw dbError(error);
    const currency = new Map(subs.map((s) => [s.id, s.currency]));
    for (const p of data) {
      if (currency.get(p.subscription_id) !== p.currency) continue;
      sums.set(p.subscription_id, cents(sums.get(p.subscription_id) ?? 0, Number(p.amount)));
    }
    return sums;
  }

  /** The student and the guardian's country (the quote's default country, S2). */
  async studentForQuote(id: string): Promise<{ id: string; country: string | null } | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id, guardian:guardians(country)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data ? { id: data.id, country: data.guardian?.country ?? null } : null;
  }
}

/** Adds money without float drift (numeric(12,2)). */
export function cents(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100;
}
