import type { Page } from '@ab/core';
import type {
  EARNING_SORT_KEYS,
  EarningsListQuery,
  TEACHER_PAYMENT_SORT_KEYS,
  TeacherPaymentListQuery,
} from '@ab/money';
import type { Db } from '@/common/db/db.module';
import { ilikeContains } from '@/common/db/or-filter';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage, toPage } from '@/common/db/page';
import { lessonNames } from './earnings.names';
import type {
  EarningRow,
  PaymentRow,
  SessionRow,
} from '@/modules/finance/teacher-earnings/earnings.repo';

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
  fallback: [{ column: 'starts_at', ascending: false }],
};

/** Payments: newest first by default. */
const PAYMENT_SORT: SortSpec<(typeof TEACHER_PAYMENT_SORT_KEYS)[number]> = {
  columns: {
    paid_at: { column: 'paid_at' },
    amount: { column: 'amount' },
    method: { column: 'method' },
  },
  fallback: [{ column: 'paid_at', ascending: false }],
};

interface For<F> { teacherId: string; filter: F }

function sessionsQuery(db: Db, q: For<EarningsListQuery>) {
  const f = q.filter;
  let query = db.from(COUNTABLE).select('*', { count: 'exact' }).eq('teacher_id', q.teacherId);
  if (f.status === 'unpaid') query = query.in('status', [...UNPAID]);
  else if (f.status) query = query.eq('status', f.status);
  return query.returns<EarningRow[]>();
}

/** One page of the teacher's countable sessions, with the students of each lesson attached. */
export async function sessionsPage(db: Db, q: For<EarningsListQuery>): Promise<Page<SessionRow>> {
  const f = q.filter;
  const { rows: data, total } = await readPage(() => sessionsQuery(db, q), f, SESSION_SORT);
  const names = await lessonNames(
    db,
    data.map((r) => r.lesson_id),
  );
  const items = data.map((r) => ({
    ...r,
    lesson: { lesson_students: names.get(r.lesson_id) ?? [] },
  }));
  return toPage(items, total, f);
}

/** One page of the payments made to the teacher, voided ones included unless filtered. */
export async function paymentsPage(
  db: Db,
  q: For<TeacherPaymentListQuery>,
): Promise<Page<PaymentRow>> {
  const f = q.filter;
  const read = await readPage(() => paymentsQuery(db, q), f, PAYMENT_SORT);
  return toPage(read.rows, read.total, f);
}

function paymentsQuery(db: Db, q: For<TeacherPaymentListQuery>) {
  const f = q.filter;
  let query = db
    .from('teacher_payments')
    .select(PAYMENT, { count: 'exact' })
    .eq('teacher_id', q.teacherId);
  if (f.method) query = query.eq('method', f.method);
  if (f.voided === 'true') query = query.not('voided_at', 'is', null);
  else if (f.voided === 'false') query = query.is('voided_at', null);
  if (f.note) query = query.ilike('note', ilikeContains(f.note));
  return query;
}
