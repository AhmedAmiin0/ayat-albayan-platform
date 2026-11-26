import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { netPaidIn } from '@ab/money';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readPage, toPage } from '@/common/db/page';
import { ilikeContains } from '@/common/db/or-filter';
import { done, maybe, pgError, rows } from '@/common/db/errors';
import { readChunked, readChunkedAll } from '@/common/db/read-all';
import { listSelect, SELECT, SUB_SORT, type SubListQuery } from '@/modules/finance/subscriptions/list/subscriptions.list-query';
import type { Page } from '@ab/core';

export type { SubListQuery } from '@/modules/finance/subscriptions/list/subscriptions.list-query';

export type StudentRef = { id: string; code: string | null; name: string };
export type SubRow = Tables<'subscriptions'> & { student: StudentRef | null };

/** All supabase access for `subscriptions` (service role; the controllers guard). R-SUB-01. */
@Injectable()
export class SubscriptionsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: SubListQuery): Promise<Page<SubRow>> {
    const read = await readPage(() => this.listQuery(q), q, SUB_SORT);
    return toPage(read.rows, read.total, q);
  }

  private listQuery(q: SubListQuery) {
    let query = this.db.from('subscriptions').select(listSelect(q), { count: 'exact' });
    if (q.paid === 'partial') query = query.eq('status', 'unpaid');
    if (q.status) query = query.eq('status', q.status);
    if (q.studentId) query = query.eq('student_id', q.studentId);
    if (q.student) query = query.ilike('student.name', ilikeContains(q.student));
    if (q.package) query = query.eq('package', q.package);
    return query;
  }

  async get(id: string): Promise<SubRow | null> {
    return maybe(await this.db
      .from('subscriptions')
      .select(SELECT)
      .eq('id', id)
      .maybeSingle());
  }

  /** A student's packages in FIFO order (starts_on, created_at, id), as the balance view. */
  async forStudent(studentId: string): Promise<SubRow[]> {
    return rows(await this.db
      .from('subscriptions')
      .select(SELECT)
      .eq('student_id', studentId)
      .order('starts_on')
      .order('created_at')
      .order('id'));
  }

  /** Several students' packages (no join), FIFO order within each student. */
  async forStudents(studentIds: readonly string[]): Promise<Tables<'subscriptions'>[]> {
    return readChunkedAll(studentIds, (chunk, from, to) =>
      this.db
        .from('subscriptions')
        .select('*')
        .in('student_id', chunk)
        .order('starts_on')
        .order('created_at')
        .order('id')
        .range(from, to),
    );
  }

  /** forStudent for several students at once, FIFO order within each student. */
  async withStudentFor(studentIds: readonly string[]): Promise<SubRow[]> {
    return readChunkedAll(studentIds, (chunk, from, to) =>
      this.db
        .from('subscriptions')
        .select(SELECT)
        .in('student_id', chunk)
        .order('starts_on')
        .order('created_at')
        .order('id')
        .range(from, to),
    );
  }

  /** null: a package with this client_request_id already exists (a retry raced it). */
  async insert(row: TablesInsert<'subscriptions'>): Promise<SubRow | null> {
    const { data, error } = await this.db.from('subscriptions').insert(row).select(SELECT).single();
    if (error?.code === '23505' && error.message.includes('client_request_id')) return null;
    if (error) throw pgError(error);
    return data;
  }

  /** The package a subscribe form already created (its client_request_id), or null. */
  async byRequest(clientRequestId: string): Promise<SubRow | null> {
    return maybe(await this.db
      .from('subscriptions')
      .select(SELECT)
      .eq('client_request_id', clientRequestId)
      .maybeSingle());
  }

  async update(id: string, patch: TablesUpdate<'subscriptions'>): Promise<SubRow | null> {
    return maybe(await this.db
      .from('subscriptions')
      .update(patch)
      .eq('id', id)
      .select(SELECT)
      .maybeSingle());
  }

  async remove(id: string): Promise<void> {
    done(await this.db.from('subscriptions').delete().eq('id', id));
  }

  async hasPayments(id: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', id);
    if (error) throw pgError(error);
    return (count ?? 0) > 0;
  }

  /**
   * Net paid per package in its own currency: payments − refunds. A payment sent in another
   * currency is stored converted (original kept apart); a legacy unconverted row is skipped.
   */
  async paid(subs: readonly Pick<SubRow, 'id' | 'currency'>[]): Promise<Map<string, number>> {
    const data = await readChunked(
      subs.map((s) => s.id),
      (chunk) =>
        this.db
          .from('payments')
          .select('subscription_id, amount, currency, kind')
          .in('subscription_id', chunk),
    );
    const rowsOf = (id: string) => data.filter((p) => p.subscription_id === id);
    return new Map(subs.map((s) => [s.id, netPaidIn(rowsOf(s.id), s.currency)]));
  }

  /** The student and the guardian's country (the quote's default country, S2). */
  async studentForQuote(id: string): Promise<{ id: string; country: string | null } | null> {
    const data = maybe(await this.db
      .from('students')
      .select('id, guardian:guardians(country)')
      .eq('id', id)
      .maybeSingle());
    return data ? { id: data.id, country: data.guardian?.country ?? null } : null;
  }
}
