import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PaymentsRepo } from './payments.repo';

interface Call { table: string; method: string; args: unknown[] }
const argsAll = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);
const methods = (calls: Call[]) => calls.map((c) => c.method);

const SELECT =
  '*, subscription:subscriptions!inner(student_id, currency, status, cancel_kind, student:students(id, code, name))';
const row = {
  subscription_id: 'u1', amount: 50, currency: 'USD', method: 'cash' as const, paid_at: 'P',
};

describe('PaymentsRepo.insert shape', () => {
  it('insert → select the full row → single, one trip', async () => {
    const { db, calls, trips } = fakeDb({ payments: [{ data: { id: 'p1' } }] });
    expect(await new PaymentsRepo(db).insert(row)).toEqual({ id: 'p1' });
    expect(methods(calls)).toEqual(['insert', 'select', 'single']);
    expect(argsAll(calls, 'insert')).toEqual([[row]]);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(trips).toEqual(['payments']);
  });

  it('a duplicate client_request_id is a raced retry: null, not an error', async () => {
    const error = { code: '23505', message: 'payments_client_request_id_key' };
    const { db } = fakeDb({ payments: [{ error }] });
    expect(await new PaymentsRepo(db).insert(row)).toBeNull();
  });

  it('another unique violation is a 409 duplicate', async () => {
    const error = { code: '23505', message: 'payments_invoice_id_key' };
    const { db } = fakeDb({ payments: [{ error }] });
    await expect(new PaymentsRepo(db).insert(row)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('PaymentsRepo.update shape', () => {
  it('update the patch where id, then select the full row, single', async () => {
    const { db, calls, trips } = fakeDb({ payments: [{ data: { id: 'p1' } }] });
    expect(await new PaymentsRepo(db).update('p1', { note: 'x' })).toEqual({ id: 'p1' });
    expect(methods(calls)).toEqual(['update', 'eq', 'select', 'single']);
    expect(argsAll(calls, 'update')).toEqual([[{ note: 'x' }]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'p1']]);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(trips).toEqual(['payments']);
  });

  it('the attachments check constraint is a 400 attachments_not_allowed', async () => {
    const error = { code: '23514', message: 'payments_attachments_bank_only' };
    const { db } = fakeDb({ payments: [{ error }] });
    const out = new PaymentsRepo(db).update('p1', { method: 'cash' });
    await expect(out).rejects.toBeInstanceOf(BadRequestException);
  });

  it('another check violation is a plain db error', async () => {
    const error = { code: '23514', message: 'payments_amount_check' };
    const { db } = fakeDb({ payments: [{ error }] });
    await expect(new PaymentsRepo(db).update('p1', {})).rejects.toThrow('db error 23514');
  });
});

describe('PaymentsRepo.remove shape', () => {
  it('delete where id, one trip, nothing returned', async () => {
    const { db, calls, trips } = fakeDb({ payments: [{}] });
    await new PaymentsRepo(db).remove('p1');
    expect(methods(calls)).toEqual(['delete', 'eq']);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'p1']]);
    expect(trips).toEqual(['payments']);
  });

  it('a foreign-key violation is a 409', async () => {
    const { db } = fakeDb({ payments: [{ error: { code: '23503', message: 'fk' } }] });
    await expect(new PaymentsRepo(db).remove('p1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('PaymentsRepo read failures are thrown, never swallowed', () => {
  const boom = { code: 'XX000', message: 'boom' };
  it.each([
    ['list', (r: PaymentsRepo) => r.list({ page: 1, pageSize: 5 })],
    ['totals', (r: PaymentsRepo) => r.totals({ page: 1, pageSize: 5 })],
    ['netPaid', (r: PaymentsRepo) => r.netPaid('u1')],
    ['get', (r: PaymentsRepo) => r.get('p1')],
    ['byRequest', (r: PaymentsRepo) => r.byRequest('r1')],
    ['byInvoice', (r: PaymentsRepo) => r.byInvoice('i1')],
  ] as const)('%s', async (_name, run) => {
    const { db } = fakeDb({ payments: [{ error: boom }] });
    await expect(run(new PaymentsRepo(db))).rejects.toThrow('db error XX000: boom');
  });

  it('subscription and recorders too', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: boom }], profiles: [{ error: boom }] });
    const repo = new PaymentsRepo(db);
    await expect(repo.subscription('u1')).rejects.toThrow('boom');
    await expect(repo.recorders(['a1'])).rejects.toThrow('boom');
  });
});
