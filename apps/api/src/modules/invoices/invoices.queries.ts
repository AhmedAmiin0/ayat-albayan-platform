import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { applySort, ilikeContains, type SortSpec } from '../../common/list-sort';
import { dbError } from '../teachers/http';
import type { InvoiceSortKey, RecentFilter } from './invoices.dto';

export type InvoiceRowOut = {
  id: string;
  rule_id: string | null;
  kind: 'package' | 'makeup';
  storage_path: string;
  mime: string;
  size_bytes: number;
  source: 'upload' | 'whatsapp';
  created_at: string;
  students: { id: string; name: string; code: string }[];
};

const SELECT =
  'id, rule_id, kind, storage_path, mime, size_bytes, source, created_at, rule:schedule_rules(schedule_rule_students(student:students(id, name, code)))';

const RECENT_SORT: SortSpec<InvoiceSortKey> = {
  columns: { created_at: { column: 'created_at' }, kind: { column: 'kind' } },
  fallback: { column: 'created_at', ascending: false },
};

/** The invoices table (service role; the controller is admin-only, and RLS has no other policy). */
@Injectable()
export class InvoicesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Newest first. */
  async byRules(ruleIds: readonly string[]): Promise<InvoiceRowOut[]> {
    if (ruleIds.length === 0) return [];
    const { data, error } = await this.db
      .from('invoices')
      .select(SELECT)
      .in('rule_id', [...ruleIds])
      .order('created_at', { ascending: false });
    if (error) throw dbError(error);
    return data.flatMap(toRow);
  }

  async get(id: string): Promise<InvoiceRowOut | null> {
    const { data, error } = await this.db.from('invoices').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data ? (toRow(data)[0] ?? null) : null;
  }

  /** Every invoice in a created_at window, newest first unless sorted (the admin list page). */
  async recent(f: RecentFilter): Promise<{ rows: InvoiceRowOut[]; total: number }> {
    const start = (f.page - 1) * f.pageSize;
    const rules = f.student === undefined ? undefined : await this.ruleIdsNamed(f.student);
    if (rules?.length === 0) return { rows: [], total: 0 };
    let q = this.db.from('invoices').select(SELECT, { count: 'exact' });
    if (f.from) q = q.gte('created_at', f.from);
    if (f.to) q = q.lt('created_at', f.to);
    if (f.kind) q = q.eq('kind', f.kind);
    if (rules) q = q.in('rule_id', rules);
    const { data, count, error } = await applySort(q, f, RECENT_SORT).order('id').range(start, start + f.pageSize - 1);
    if (error) throw dbError(error);
    return { rows: data.flatMap(toRow), total: count ?? 0 };
  }

  /** The bookings with a student whose name contains `name` (the «الطلاب» filter). */
  private async ruleIdsNamed(name: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select('rule_id, student:students!inner(name)')
      .ilike('student.name', ilikeContains(name))
      .limit(500);
    if (error) throw dbError(error);
    return [...new Set(data.map((r) => r.rule_id))];
  }

  /** invoice id → the payment recorded from it. */
  async paymentsOf(invoiceIds: readonly string[]): Promise<Map<string, string>> {
    if (invoiceIds.length === 0) return new Map();
    const { data, error } = await this.db.from('payments').select('id, invoice_id').in('invoice_id', [...invoiceIds]);
    if (error) throw dbError(error);
    return new Map(data.flatMap((p) => (p.invoice_id ? [[p.invoice_id, p.id] as const] : [])));
  }

  /** The rules a student is on (their bookings). */
  async ruleIdsOf(studentId: string): Promise<string[]> {
    const { data, error } = await this.db.from('schedule_rule_students').select('rule_id').eq('student_id', studentId);
    if (error) throw dbError(error);
    return data.map((r) => r.rule_id);
  }
}

type Fetched = {
  id: string;
  rule_id: string | null;
  kind: 'trial' | 'package' | 'makeup';
  storage_path: string;
  mime: string;
  size_bytes: number;
  source: string;
  created_at: string;
  rule: { schedule_rule_students: { student: { id: string; name: string; code: string | null } | null }[] } | null;
};

/** A trial never has an invoice (check constraint), so a trial row cannot occur and is skipped. */
function toRow(r: Fetched): InvoiceRowOut[] {
  if (r.kind === 'trial') return [];
  const students = (r.rule?.schedule_rule_students ?? []).flatMap((s) =>
    s.student ? [{ id: s.student.id, name: s.student.name, code: s.student.code ?? '' }] : [],
  );
  return [
    {
      id: r.id,
      rule_id: r.rule_id,
      kind: r.kind,
      storage_path: r.storage_path,
      mime: r.mime,
      size_bytes: r.size_bytes,
      source: r.source === 'whatsapp' ? 'whatsapp' : 'upload',
      created_at: r.created_at,
      students,
    },
  ];
}
