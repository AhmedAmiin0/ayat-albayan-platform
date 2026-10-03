import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { earning, TEACHER } from './earnings.fakes';
import { EarningsQueries } from './earnings.queries';

const err = (code: string, message: string) => ({ code, message });

describe('EarningsQueries', () => {
  it('sessions: the teacher’s rows, the unpaid alias is earned + partially_paid, newest first', async () => {
    const { db, calls } = fakeDb({ teacher_session_earnings: [{ data: [], count: 0 }] });
    await new EarningsQueries(db).sessions(TEACHER, { status: 'unpaid', page: 2, pageSize: 10 });
    const on = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
    expect(on('eq')).toEqual([['teacher_id', TEACHER]]);
    expect(on('in')).toEqual([['status', ['earned', 'partially_paid']]]);
    expect(on('range')).toEqual([[10, 19]]);
  });

  it('forPayment: ticked ids stay inside the teacher’s own rows; no ids → unpaid only', async () => {
    const a = fakeDb({ teacher_session_earnings: [{ data: [] }] });
    await new EarningsQueries(a.db).forPayment(TEACHER, ['x']);
    expect(a.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['teacher_id', TEACHER]]);
    expect(a.argsOf('teacher_session_earnings', 'in')).toEqual(['id', ['x']]);
    const b = fakeDb({ teacher_session_earnings: [{ data: [] }] });
    await new EarningsQueries(b.db).forPayment(TEACHER, undefined);
    expect(b.argsOf('teacher_session_earnings', 'in')).toEqual(['status', ['earned', 'partially_paid']]);
  });

  it('money reads every page of 1000', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), amount: 1, paid_amount: 0 }));
    const { db } = fakeDb({ teacher_session_earnings: [{ data: page }, { data: [earning(1)] }] });
    expect(await new EarningsQueries(db).money(TEACHER)).toHaveLength(1001);
  });

  it('record maps the raised codes to HTTP errors', async () => {
    const q = (e: ReturnType<typeof err>) => new EarningsQueries(fakeDb({ 'rpc:record_teacher_payment': [{ error: e }] }).db).record({});
    await expect(q(err('P0001', 'overpayment'))).rejects.toMatchObject({ status: 409 });
    await expect(q(err('P0001', 'allocation_mismatch'))).rejects.toMatchObject({ status: 400 });
    await expect(q(err('P0001', 'earning_not_found'))).rejects.toMatchObject({ status: 404 });
    await expect(q(err('XX000', 'boom'))).rejects.toThrow('db error');
  });

  it('record returns the payment id and whether it was a replay', async () => {
    const { db } = fakeDb({ 'rpc:record_teacher_payment': [{ data: { payment_id: 'p', replayed: true } }] });
    expect(await new EarningsQueries(db).record({})).toEqual({ payment_id: 'p', replayed: true });
  });

  it('paidOnLessons sums in piasters, in chunks of 100 ids', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `l${i}`);
    const { db } = fakeDb({ teacher_session_earnings: [{ data: [{ paid_amount: 0.1 }] }, { data: [{ paid_amount: 0.2 }] }] });
    expect(await new EarningsQueries(db).paidOnLessons(ids)).toBe(0.3);
  });
});
