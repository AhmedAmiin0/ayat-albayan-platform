import type { EARNING_SORT_KEYS, EarningsListQuery, TEACHER_PAYMENT_SORT_KEYS, TeacherPaymentListQuery } from '@ab/shared';
import type { Db } from '../../../../common/db/db.module';
import { applySort, ilikeContains, type SortSpec } from '../../../../common/list-sort';
import { dbError, type Page } from '../../../../common/http/http';
import { lessonNames } from './earnings.names';
import type { EarningRow, PaymentRow, SessionRow } from '../earnings.queries';

// The two paged lists of a teacher's money (R-NFR-08): sessions and payments, sorted server-side.

// Reads go through the view of migration 183: only sessions of subscribed students.
const COUNTABLE = 'v_teacher_countable_earnings';
const PAYMENT = '*, items:teacher_payment_items(earning_id)';
const UNPAID = ['earned', 'partially_paid'] as const;

/** Sessions: newest first by default. (Students are read afterwards, so they do not sort.) */
const SESSION_SORT: SortSpec<(typeof EARNING_SORT_KEYS)[number]> = {
  columns: {
    starts_at: { column: 'starts_at' },
    minutes: { column: 'minutes' },
    amount: { column: 'amount' },
    paid_amount: { column: 'paid_amount' },
    status: { column: 'status' },
  },
  fallback: { column: 'starts_at', ascending: false },
};

/** Payments: newest first by default. */
const PAYMENT_SORT: SortSpec<(typeof TEACHER_PAYMENT_SORT_KEYS)[number]> = {
  columns: { paid_at: { column: 'paid_at' }, amount: { column: 'amount' }, method: { column: 'method' } },
  fallback: { column: 'paid_at', ascending: false },
};

type For<F> = { teacherId: string; filter: F };

/** One page of the teacher's countable sessions, with the students of each lesson attached. */
export async function sessionsPage(db: Db, q: For<EarningsListQuery>): Promise<Page<SessionRow>> {
  const f = q.filter;
  const from = (f.page - 1) * f.pageSize;
  let query = db.from(COUNTABLE).select('*', { count: 'exact' }).eq('teacher_id', q.teacherId);
  if (f.status === 'unpaid') query = query.in('status', [...UNPAID]);
  else if (f.status) query = query.eq('status', f.status);
  const { data, count, error } = await applySort(query, f, SESSION_SORT)
    .order('id')
    .range(from, from + f.pageSize - 1)
    .returns<EarningRow[]>();
  if (error) throw dbError(error);
  const names = await lessonNames(db, data.map((r) => r.lesson_id));
  const items = data.map((r) => ({ ...r, lesson: { lesson_students: names.get(r.lesson_id) ?? [] } }));
  return { items, total: count ?? 0, page: f.page, pageSize: f.pageSize };
}

/** One page of the payments made to the teacher, voided ones included unless filtered. */
export async function paymentsPage(db: Db, q: For<TeacherPaymentListQuery>): Promise<Page<PaymentRow>> {
  const f = q.filter;
  const from = (f.page - 1) * f.pageSize;
  let query = db.from('teacher_payments').select(PAYMENT, { count: 'exact' }).eq('teacher_id', q.teacherId);
  if (f.method) query = query.eq('method', f.method);
  if (f.voided === 'true') query = query.not('voided_at', 'is', null);
  else if (f.voided === 'false') query = query.is('voided_at', null);
  if (f.note) query = query.ilike('note', ilikeContains(f.note));
  const { data, count, error } = await applySort(query, f, PAYMENT_SORT)
    .order('id')
    .range(from, from + f.pageSize - 1);
  if (error) throw dbError(error);
  return { items: data, total: count ?? 0, page: f.page, pageSize: f.pageSize };
}
