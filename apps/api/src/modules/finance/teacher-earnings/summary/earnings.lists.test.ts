import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { TEACHER } from '@/modules/finance/teacher-earnings/earnings.fakes';
import { paymentsPage, sessionsPage } from './earnings.lists';

const V = 'v_teacher_countable_earnings';
const P = 'teacher_payments';
const page = { page: 1, pageSize: 20 };
const on = (
  calls: { table: string; method: string; args: unknown[] }[],
  table: string,
  method: string,
) => calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

describe('teacher earnings lists (R-NFR-08)', () => {
  it('sessions: newest first by default, then id', async () => {
    const { db, calls } = fakeDb({ [V]: [{ data: [], count: 0 }] });
    await sessionsPage(db, { teacherId: TEACHER, filter: page });
    expect(on(calls, V, 'order')).toEqual([
      ['starts_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('sessions: a sort key, then the default order as tiebreaker', async () => {
    const { db, calls } = fakeDb({ [V]: [{ data: [], count: 0 }] });
    await sessionsPage(db, {
      teacherId: TEACHER,
      filter: { ...page, sort: 'paid_amount', dir: 'desc' },
    });
    expect(on(calls, V, 'order')).toEqual([
      ['paid_amount', { ascending: false }],
      ['starts_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('payments: method and «standing only» filters, amount sort', async () => {
    const { db, calls } = fakeDb({ [P]: [{ data: [], count: 0 }] });
    await paymentsPage(db, {
      teacherId: TEACHER,
      filter: { ...page, method: 'cash', voided: 'false', sort: 'amount' },
    });
    expect(on(calls, P, 'eq')).toEqual([
      ['teacher_id', TEACHER],
      ['method', 'cash'],
    ]);
    expect(on(calls, P, 'is')).toEqual([['voided_at', null]]);
    expect(on(calls, P, 'order')[0]).toEqual(['amount', { ascending: true }]);
  });

  it('payments: «voided only» and the note filter, newest first by default', async () => {
    const { db, calls } = fakeDb({ [P]: [{ data: [], count: 0 }] });
    await paymentsPage(db, {
      teacherId: TEACHER,
      filter: { ...page, voided: 'true', note: 'أكتوبر' },
    });
    expect(on(calls, P, 'not')).toEqual([['voided_at', 'is', null]]);
    expect(on(calls, P, 'ilike')).toEqual([['note', '%أكتوبر%']]);
    expect(on(calls, P, 'order')).toEqual([
      ['paid_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });
});

describe('earnings lists error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ [P]: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(paymentsPage(db, { teacherId: TEACHER, filter: page }))).toEqual(
      {
        status: 409,
        body: { message: 'duplicate' },
      },
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ [P]: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(paymentsPage(db, { teacherId: TEACHER, filter: page }))).toEqual(
      {
        status: 500,
        body: 'db error XX000: boom',
      },
    );
  });
});
