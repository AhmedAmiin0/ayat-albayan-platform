import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { STATEMENT_SELECT } from './statements.mapper';
import { StatementsRepo } from './statements.repo';

interface Call { table: string; method: string; args: unknown[] }
const argsAll = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

describe('StatementsRepo.get shape', () => {
  it('the statement with its lines, eq(id), maybeSingle, one trip', async () => {
    const row = { id: 'st1', month: '2026-10-01', lines: [] };
    const { db, calls, trips } = fakeDb({ assistant_statements: [{ data: row }] });
    expect(await new StatementsRepo(db).get('st1')).toEqual(row);
    expect(calls.every((c) => c.table === 'assistant_statements')).toBe(true);
    expect(argsAll(calls, 'select')).toEqual([[STATEMENT_SELECT]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'st1']]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
    expect(trips).toEqual(['assistant_statements']);
  });

  it('a missing statement is null', async () => {
    const { db } = fakeDb({ assistant_statements: [{ data: null }] });
    expect(await new StatementsRepo(db).get('x')).toBeNull();
  });

  it('a db error is thrown', async () => {
    const error = { code: 'XX000', message: 'boom' };
    const { db } = fakeDb({ assistant_statements: [{ error }] });
    await expect(new StatementsRepo(db).get('st1')).rejects.toThrow('db error XX000: boom');
  });
});

describe('StatementsRepo.list shape (month and status filters)', () => {
  it('eq month and status in that order, the full select, newest month first, one trip', async () => {
    const { db, calls, trips } = fakeDb({ assistant_statements: [{ data: [] }] });
    await new StatementsRepo(db).list({ month: '2026-10-01', status: 'paid' });
    expect(argsAll(calls, 'select')).toEqual([[STATEMENT_SELECT]]);
    expect(argsAll(calls, 'eq')).toEqual([
      ['month', '2026-10-01'],
      ['status', 'paid'],
    ]);
    expect(argsAll(calls, 'neq')).toEqual([]);
    expect(argsAll(calls, 'order')).toEqual([['month', { ascending: false }]]);
    expect(argsAll(calls, 'limit')).toEqual([]);
    expect(trips).toEqual(['assistant_statements']);
  });

  it('a statement with no assistant sorts as an empty name, first in its month', async () => {
    const rows = [
      { id: 'a', month: '2026-10-01', assistant: { id: 'p1', full_name: 'أمل' } },
      { id: 'b', month: '2026-10-01', assistant: null },
    ];
    const { db } = fakeDb({ assistant_statements: [{ data: rows }] });
    expect((await new StatementsRepo(db).list({})).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('a db error is thrown', async () => {
    const { db } = fakeDb({ assistant_statements: [{ error: { message: 'boom' } }] });
    await expect(new StatementsRepo(db).list({})).rejects.toThrow('boom');
  });
});
