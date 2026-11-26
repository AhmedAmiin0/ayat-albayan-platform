import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MAX_ROWS } from '@/common/db/read-all';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ExpensesRepo } from './expenses.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsAll = (calls: Calls, method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const CATEGORY_COLUMNS = 'key, label_ar, label_en, active';
const boom = { code: 'XX000', message: 'boom' };

describe('ExpensesRepo.between: one bounded read of the month span', () => {
  it('selects *, month span, sorted month → category → created_at, ≤ MAX_ROWS (the server cap)', async () => {
    const rows = [{ id: 'e1' }];
    const { db, calls, trips } = fakeDb({ expenses: [{ data: rows }] });
    const out = await new ExpensesRepo(db).between('2026-01-01', '2026-03-01');
    expect(out).toBe(rows);
    expect(trips).toEqual(['expenses']);
    expect(argsAll(calls, 'select')).toEqual([['*']]);
    expect(argsAll(calls, 'gte')).toEqual([['month', '2026-01-01']]);
    expect(argsAll(calls, 'lte')).toEqual([['month', '2026-03-01']]);
    expect(argsAll(calls, 'order')).toEqual([['month'], ['category'], ['created_at']]);
    expect(argsAll(calls, 'limit')).toEqual([[MAX_ROWS]]);
  });

  it('a database error is thrown with its code', async () => {
    const { db } = fakeDb({ expenses: [{ error: boom }] });
    await expect(new ExpensesRepo(db).between('2026-01-01', '2026-01-01')).rejects.toThrow(
      'db error XX000: boom',
    );
  });
});

describe('ExpensesRepo single-row reads and writes', () => {
  it('get: by id, maybeSingle; null when there is none', async () => {
    const { db, calls, trips } = fakeDb({ expenses: [{ data: null }] });
    expect(await new ExpensesRepo(db).get('e1')).toBeNull();
    expect(trips).toEqual(['expenses']);
    expect(argsAll(calls, 'select')).toEqual([['*']]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'e1']]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
  });

  it('insert: the row, read back with * as a single row', async () => {
    const row = { month: '2026-05-01', category: 'rent', amount: 100 };
    const saved = { id: 'e1', ...row };
    const { db, calls, trips } = fakeDb({ expenses: [{ data: saved }] });
    expect(await new ExpensesRepo(db).insert(row)).toBe(saved);
    expect(trips).toEqual(['expenses']);
    expect(calls.map((c) => c.method)).toEqual(['insert', 'select', 'single']);
    expect(argsAll(calls, 'insert')).toEqual([[row]]);
    expect(argsAll(calls, 'select')).toEqual([['*']]);
  });

  it('update: the patch on that id only, read back with *', async () => {
    const saved = { id: 'e1', note: 'n' };
    const { db, calls, trips } = fakeDb({ expenses: [{ data: saved }] });
    expect(await new ExpensesRepo(db).update('e1', { note: 'n' })).toBe(saved);
    expect(trips).toEqual(['expenses']);
    expect(calls.map((c) => c.method)).toEqual(['update', 'eq', 'select', 'single']);
    expect(argsAll(calls, 'update')).toEqual([[{ note: 'n' }]]);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'e1']]);
  });

  it('remove: delete by id, one trip', async () => {
    const { db, calls, trips } = fakeDb({ expenses: [{}] });
    await new ExpensesRepo(db).remove('e1');
    expect(trips).toEqual(['expenses']);
    expect(calls.map((c) => c.method)).toEqual(['delete', 'eq']);
    expect(argsAll(calls, 'eq')).toEqual([['id', 'e1']]);
  });

  it('remove: a foreign-key violation becomes a ConflictException', async () => {
    const { db } = fakeDb({ expenses: [{ error: { code: '23503', message: 'fk' } }] });
    await expect(new ExpensesRepo(db).remove('e1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ExpensesRepo categories', () => {
  it('categories: four columns, sorted by sort then key, no bound', async () => {
    const rows = [{ key: 'rent', label_ar: 'إيجار', label_en: 'Rent', active: true }];
    const { db, calls, trips } = fakeDb({ expense_categories: [{ data: rows }] });
    expect(await new ExpensesRepo(db).categories()).toBe(rows);
    expect(trips).toEqual(['expense_categories']);
    expect(argsAll(calls, 'select')).toEqual([[CATEGORY_COLUMNS]]);
    expect(argsAll(calls, 'order')).toEqual([['sort'], ['key']]);
    expect(argsAll(calls, 'limit')).toEqual([]);
  });

  it('addCategory: inserts the row and reads the four columns back', async () => {
    const row = { key: 'rent', label_ar: 'إيجار' };
    const saved = { ...row, label_en: null, active: true };
    const { db, calls } = fakeDb({ expense_categories: [{ data: saved }] });
    expect(await new ExpensesRepo(db).addCategory(row)).toBe(saved);
    expect(calls.map((c) => c.method)).toEqual(['insert', 'select', 'single']);
    expect(argsAll(calls, 'insert')).toEqual([[row]]);
    expect(argsAll(calls, 'select')).toEqual([[CATEGORY_COLUMNS]]);
  });

  it('addCategory: a duplicate key (23505) is null, not an error', async () => {
    const { db } = fakeDb({ expense_categories: [{ error: { code: '23505', message: 'dup' } }] });
    expect(await new ExpensesRepo(db).addCategory({ key: 'rent', label_ar: 'إيجار' })).toBeNull();
  });

  it('addCategory: any other error is thrown', async () => {
    const { db } = fakeDb({ expense_categories: [{ error: boom }] });
    const add = new ExpensesRepo(db).addCategory({ key: 'rent', label_ar: 'إيجار' });
    await expect(add).rejects.toThrow('db error XX000: boom');
  });
});

describe('ExpensesRepo.createRecurringDrafts', () => {
  it('one rpc with p_month, returning the count it made', async () => {
    const { db, calls, trips } = fakeDb({ 'rpc:create_recurring_expense_drafts': [{ data: 3 }] });
    expect(await new ExpensesRepo(db).createRecurringDrafts('2026-06-01')).toBe(3);
    expect(trips).toEqual(['rpc:create_recurring_expense_drafts']);
    expect(argsAll(calls, 'rpc')).toEqual([[{ p_month: '2026-06-01' }]]);
  });

  it('an rpc error is thrown', async () => {
    const { db } = fakeDb({ 'rpc:create_recurring_expense_drafts': [{ error: boom }] });
    await expect(new ExpensesRepo(db).createRecurringDrafts('2026-06-01')).rejects.toThrow('boom');
  });
});
