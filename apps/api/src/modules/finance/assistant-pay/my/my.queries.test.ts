import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { MY_PAYMENTS_LIMIT, MyQueries } from './my.queries';
import { StatementsQueries } from '../statements/statements.queries';

const eqs = (calls: { method: string; args: unknown[] }[]) => calls.filter((c) => c.method === 'eq').map((c) => c.args);

describe('MyQueries: every read is filtered on the signed-in profile, and only on it', () => {
  it('payments: recorded_by = me is the ONLY filter, the select reaches the student and never a price', async () => {
    const { db, calls } = fakeDb({ payments: [{ data: [] }] });
    await new MyQueries(db).payments('a1');
    expect(eqs(calls)).toEqual([['recorded_by', 'a1']]);
    const select = String(calls.find((c) => c.method === 'select')?.args[0]);
    expect(select).toContain('student:students(id, code, name)');
    expect(select).not.toMatch(/price|fx_|notes|receipt/);
    expect(calls.find((c) => c.method === 'limit')?.args).toEqual([MY_PAYMENTS_LIMIT]);
  });

  it('students: the view filtered by assistant_id = me, newest first, with no money column asked', async () => {
    const { db, calls } = fakeDb({ v_assistant_students: [{ data: [] }] });
    await new MyQueries(db).students('a1');
    expect(calls.every((c) => c.table === 'v_assistant_students')).toBe(true);
    expect(eqs(calls)).toEqual([['assistant_id', 'a1']]);
    expect(String(calls.find((c) => c.method === 'select')?.args[0])).not.toMatch(/price|guardian|notes|assistant_id/);
  });

  it('guardianPhones: the students I brought (brought_by = me) with the guardian phone only, by student id', async () => {
    const rows = [{ id: 's1', guardian: { phone_e164: '+201001112223' } }, { id: 's2', guardian: null }];
    const { db, calls } = fakeDb({ students: [{ data: rows }] });
    const out = await new MyQueries(db).guardianPhones('a1');
    expect([...out]).toEqual([['s1', '+201001112223']]);
    expect(eqs(calls)).toEqual([['brought_by', 'a1']]);
    expect(calls.find((c) => c.method === 'select')?.args[0]).toBe('id, guardian:guardians(phone_e164)');
  });

  it('commissions and adjustments: mine only; commissions only the earned ones', async () => {
    const { db, calls } = fakeDb({ assistant_commissions: [{ data: [] }], assistant_adjustments: [{ data: [] }] });
    const q = new MyQueries(db);
    await q.commissions('a1');
    await q.adjustments('a1');
    expect(calls.filter((c) => c.table === 'assistant_commissions' && c.method === 'eq').map((c) => c.args)).toEqual([['assistant_id', 'a1'], ['status', 'earned']]);
    expect(calls.filter((c) => c.table === 'assistant_adjustments' && c.method === 'eq').map((c) => c.args)).toEqual([['assistant_id', 'a1']]);
  });

  it('tz: the profile of the login; UTC when it has none', async () => {
    const { db } = fakeDb({ profiles: [{ data: null }] });
    expect(await new MyQueries(db).tz('a1')).toBe('UTC');
  });

  it('a database error is thrown, never swallowed into an empty list', async () => {
    const { db } = fakeDb({ payments: [{ error: { message: 'boom' } }] });
    await expect(new MyQueries(db).payments('a1')).rejects.toBeDefined();
  });
});

describe('StatementsQueries.list: the assistant never sees a draft', () => {
  it('hideDrafts adds status <> draft next to the assistant filter', async () => {
    const { db, calls } = fakeDb({ assistant_statements: [{ data: [] }] });
    await new StatementsQueries(db).list({ assistantId: 'a1', hideDrafts: true });
    expect(eqs(calls)).toEqual([['assistant_id', 'a1']]);
    expect(calls.find((c) => c.method === 'neq')?.args).toEqual(['status', 'draft']);
  });

  it('the admin list has no such filter, and sorts by newest month then name', async () => {
    const row = (id: string, month: string, name: string) => ({ id, month, assistant: { id, full_name: name } });
    const { db, calls } = fakeDb({ assistant_statements: [{ data: [row('1', '2026-09-01', 'ب'), row('2', '2026-10-01', 'ب'), row('3', '2026-10-01', 'أ')] }] });
    const rows = await new StatementsQueries(db).list({});
    expect(calls.some((c) => c.method === 'neq')).toBe(false);
    expect(rows.map((r) => r.id)).toEqual(['3', '2', '1']);
  });
});
