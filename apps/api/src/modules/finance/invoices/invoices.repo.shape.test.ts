import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { InvoicesRepo } from './invoices.repo';

interface Call { table: string; method: string; args: unknown[] }
const argsAll = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const SELECT =
  'id, rule_id, kind, storage_path, mime, size_bytes, source, created_at, rule:schedule_rules(schedule_rule_students(student:students(id, name, code)))';
const base = {
  rule_id: 'r1', storage_path: 'r/i.png', mime: 'image/png', size_bytes: 9, created_at: 'C',
};
const students = [
  { student: { id: 's1', name: 'هدى', code: null } },
  { student: null },
  { student: { id: 's2', name: 'نور', code: 'AB-0002' } },
];
const fetched = { ...base, id: 'i1', kind: 'makeup', source: 'whatsapp', rule: { schedule_rule_students: students } };

describe('InvoicesRepo.byRules shape', () => {
  it('in(rule_id), newest first, one trip; maps students and drops trials', async () => {
    const trial = { ...fetched, id: 'i0', kind: 'trial' };
    const odd = { ...base, id: 'i2', kind: 'package', source: 'email', rule: null };
    const { db, calls, trips } = fakeDb({ invoices: [{ data: [fetched, trial, odd] }] });
    const out = await new InvoicesRepo(db).byRules(['r1', 'r2']);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(argsAll(calls, 'in')).toEqual([['rule_id', ['r1', 'r2']]]);
    expect(argsAll(calls, 'order')).toEqual([['created_at', { ascending: false }]]);
    expect(trips).toEqual(['invoices']);
    expect(out).toEqual([
      {
        ...base, id: 'i1', kind: 'makeup', source: 'whatsapp',
        students: [{ id: 's1', name: 'هدى', code: '' }, { id: 's2', name: 'نور', code: 'AB-0002' }],
      },
      { ...base, id: 'i2', kind: 'package', source: 'upload', students: [] },
    ]);
  });

  it('no rules, no trip', async () => {
    const { db, trips } = fakeDb({});
    expect(await new InvoicesRepo(db).byRules([])).toEqual([]);
    expect(trips).toEqual([]);
  });
});

describe('InvoicesRepo.get shape', () => {
  it('eq(id), maybeSingle, mapped row', async () => {
    const { db, calls, trips } = fakeDb({ invoices: [{ data: fetched }] });
    const out = await new InvoicesRepo(db).get('i1');
    expect(out?.students.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(argsAll(calls, 'select')).toEqual([[SELECT]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'i1']]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
    expect(trips).toEqual(['invoices']);
  });

  it('missing row and a trial row are both null', async () => {
    const { db } = fakeDb({ invoices: [{ data: null }, { data: { ...fetched, kind: 'trial' } }] });
    const repo = new InvoicesRepo(db);
    expect(await repo.get('x')).toBeNull();
    expect(await repo.get('i0')).toBeNull();
  });
});

describe('InvoicesRepo.paymentsOf shape', () => {
  it('in(invoice_id) on payments, mapped invoice → payment, null invoice_id skipped', async () => {
    const rows = [{ id: 'p1', invoice_id: 'i1' }, { id: 'p2', invoice_id: null }];
    const { db, calls, trips } = fakeDb({ payments: [{ data: rows }] });
    const out = await new InvoicesRepo(db).paymentsOf(['i1', 'i2']);
    expect([...out]).toEqual([['i1', 'p1']]);
    expect(argsAll(calls, 'select')).toEqual([['id, invoice_id']]);
    expect(argsAll(calls, 'in')).toEqual([['invoice_id', ['i1', 'i2']]]);
    expect(trips).toEqual(['payments']);
  });

  it('no invoices, no trip', async () => {
    const { db, trips } = fakeDb({});
    expect((await new InvoicesRepo(db).paymentsOf([])).size).toBe(0);
    expect(trips).toEqual([]);
  });
});

describe('InvoicesRepo.ruleIdsOf shape', () => {
  it('rule_id of one student on schedule_rule_students', async () => {
    const rows = [{ rule_id: 'r1' }, { rule_id: 'r2' }];
    const { db, calls, trips } = fakeDb({ schedule_rule_students: [{ data: rows }] });
    expect(await new InvoicesRepo(db).ruleIdsOf('s1')).toEqual(['r1', 'r2']);
    expect(argsAll(calls, 'select')).toEqual([['rule_id']]);
    expect(argsAll(calls, 'eq')).toEqual([['student_id', 's1']]);
    expect(trips).toEqual(['schedule_rule_students']);
  });
});

describe('InvoicesRepo failures are thrown', () => {
  const error = { code: 'XX000', message: 'boom' };
  it('every read rethrows the db error', async () => {
    const { db } = fakeDb({
      invoices: [{ error }, { error }],
      payments: [{ error }],
      schedule_rule_students: [{ error }],
    });
    const repo = new InvoicesRepo(db);
    await expect(repo.byRules(['r1'])).rejects.toThrow('db error XX000: boom');
    await expect(repo.get('i1')).rejects.toThrow('boom');
    await expect(repo.paymentsOf(['i1'])).rejects.toThrow('boom');
    await expect(repo.ruleIdsOf('s1')).rejects.toThrow('boom');
  });
});
