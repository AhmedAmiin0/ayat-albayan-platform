import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { InvoicesRepo } from './invoices.repo';

interface Call { table: string; method: string; args: unknown[] }
const on = (calls: Call[], table: string) => (method: string) =>
  calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

const SELECT =
  'id, rule_id, kind, storage_path, mime, size_bytes, source, created_at, rule:schedule_rules(schedule_rule_students(student:students(id, name, code)))';
const page = { page: 3, pageSize: 5 };

describe('InvoicesRepo.recent shape', () => {
  it('no filters: exact count, default order then id, the page as a range, one trip', async () => {
    const { db, calls, trips } = fakeDb({ invoices: [{ data: [], count: 12 }] });
    expect(await new InvoicesRepo(db).recent(page)).toEqual({ rows: [], total: 12 });
    const inv = on(calls, 'invoices');
    expect(inv('select')).toEqual([[SELECT, { count: 'exact' }]]);
    expect(inv('order')).toEqual([['created_at', { ascending: false }], ['id']]);
    expect(inv('range')).toEqual([[10, 14]]);
    expect([...inv('gte'), ...inv('lt'), ...inv('eq'), ...inv('in')]).toEqual([]);
    expect(trips).toEqual(['invoices']);
  });

  it('window and kind: gte/lt on created_at and eq kind; a null count is 0', async () => {
    const { db, calls } = fakeDb({ invoices: [{ data: [] }] });
    const f = { ...page, from: 'F', to: 'T', kind: 'makeup' as const };
    expect((await new InvoicesRepo(db).recent(f)).total).toBe(0);
    const inv = on(calls, 'invoices');
    expect(inv('gte')).toEqual([['created_at', 'F']]);
    expect(inv('lt')).toEqual([['created_at', 'T']]);
    expect(inv('eq')).toEqual([['kind', 'makeup']]);
  });

  it('student name: the matching rules first (ilike, capped 500, deduped), then in(rule_id)', async () => {
    const rules = [{ rule_id: 'r1' }, { rule_id: 'r1' }, { rule_id: 'r2' }];
    const { db, calls, trips } = fakeDb({
      schedule_rule_students: [{ data: rules }],
      invoices: [{ data: [], count: 0 }],
    });
    await new InvoicesRepo(db).recent({ ...page, student: ' 50%_x ' });
    const srs = on(calls, 'schedule_rule_students');
    expect(srs('select')).toEqual([['rule_id, student:students!inner(name)']]);
    expect(srs('ilike')).toEqual([['student.name', '%50\\%\\_x%']]);
    expect(srs('limit')).toEqual([[500]]);
    expect(on(calls, 'invoices')('in')).toEqual([['rule_id', ['r1', 'r2']]]);
    expect(trips).toEqual(['schedule_rule_students', 'invoices']);
  });

  it('a name that matches nobody: empty page, the invoices are never read', async () => {
    const { db, trips } = fakeDb({ schedule_rule_students: [{ data: [] }] });
    expect(await new InvoicesRepo(db).recent({ ...page, student: 'x' })).toEqual({
      rows: [],
      total: 0,
    });
    expect(trips).toEqual(['schedule_rule_students']);
  });

  it('a sort key orders by its column, then the fallback, then id', async () => {
    const { db, calls } = fakeDb({ invoices: [{ data: [] }] });
    await new InvoicesRepo(db).recent({ ...page, sort: 'kind', dir: 'asc' });
    expect(on(calls, 'invoices')('order')).toEqual([
      ['kind', { ascending: true }],
      ['created_at', { ascending: false }],
      ['id'],
    ]);
  });

  it('a failed name lookup or page read is thrown', async () => {
    const error = { code: 'XX000', message: 'boom' };
    const { db } = fakeDb({ schedule_rule_students: [{ error }], invoices: [{ error }] });
    const repo = new InvoicesRepo(db);
    await expect(repo.recent({ ...page, student: 'x' })).rejects.toThrow('boom');
    await expect(repo.recent(page)).rejects.toThrow('db error XX000: boom');
  });
});
