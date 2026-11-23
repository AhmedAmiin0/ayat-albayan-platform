import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { netPaidIn } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { applySort, ilikeContains } from '@/common/db/list-sort';
import { dbError } from '@/common/http/http';
import { readChunked } from '@/common/db/read-all';
import { listSelect, SELECT, SUB_SORT, type SubListQuery } from './list/subscriptions.list-query';
import type { Page } from '@ab/shared';

export type { SubListQuery } from './list/subscriptions.list-query';

export type StudentRef = { id: string; code: string | null; name: string };
export type SubRow = Tables<'subscriptions'> & { student: StudentRef | null };

/** All supabase access for `subscriptions` (service role; the controllers guard). R-SUB-01. */
@Injectable()
export class SubscriptionsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: SubListQuery): Promise<Page<SubRow>> {
    const from = (q.page - 1) * q.pageSize;
    let query = this.db.from('subscriptions').select(listSelect(q), { count: 'exact' });
    if (q.paid === 'partial') query = query.eq('status', 'unpaid');
    if (q.status) query = query.eq('status', q.status);
    if (q.studentId) query = query.eq('student_id', q.studentId);
    if (q.student) query = query.ilike('student.name', ilikeContains(q.student));
    if (q.package) query = query.eq('package', q.package);
    const { data, count, error } = await applySort(query, q, SUB_SORT)
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

  /** null: a package with this client_request_id already exists (a retry raced it). */
  async insert(row: TablesInsert<'subscriptions'>): Promise<SubRow | null> {
    const { data, error } = await this.db.from('subscriptions').insert(row).select(SELECT).single();
    if (error?.code === '23505' && error.message.includes('client_request_id')) return null;
    if (error) throw dbError(error);
    return data;
  }

  /** The package a subscribe form already created (its client_request_id), or null. */
  async byRequest(clientRequestId: string): Promise<SubRow | null> {
    const { data, error } = await this.db.from('subscriptions').select(SELECT).eq('client_request_id', clientRequestId).maybeSingle();
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

  /**
   * Net paid per package in its own currency: payments − refunds. A payment sent in another
   * currency is stored converted (original kept apart); a legacy unconverted row is skipped.
   */
  async paid(subs: readonly Pick<SubRow, 'id' | 'currency'>[]): Promise<Map<string, number>> {
    if (subs.length === 0) return new Map();
    const { data, error } = await this.db
      .from('payments')
      .select('subscription_id, amount, currency, kind')
      .in('subscription_id', subs.map((s) => s.id));
    if (error) throw dbError(error);
    const rowsOf = (id: string) => data.filter((p) => p.subscription_id === id);
    return new Map(subs.map((s) => [s.id, netPaidIn(rowsOf(s.id), s.currency)]));
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
