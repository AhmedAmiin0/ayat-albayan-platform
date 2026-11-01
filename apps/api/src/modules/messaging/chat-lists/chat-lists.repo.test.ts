import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ChatListsRepo } from './chat-lists.repo';

type Result = { data?: unknown; error?: { code: string; message: string } | null; count?: number };

/** A PostgREST builder that records every call and resolves to `result` when awaited. */
function fake(result: Result) {
  const calls: unknown[][] = [];
  const builder: object = new Proxy(
    {},
    {
      get: (_t, key) =>
        key === 'then'
          ? (resolve: (r: Result) => void) => resolve({ error: null, ...result })
          : (...args: unknown[]) => {
              calls.push([key, ...args]);
              return builder;
            },
    },
  );
  const db = { from: (table: string) => (calls.push(['from', table]), builder) };
  return { q: new ChatListsRepo(db as unknown as Db), calls };
}

const ROW = { id: 'l1', name: 'بانتظار الدفع' };

describe('ChatListsQueries', () => {
  it('reads every list oldest first with its member count', async () => {
    const { q, calls } = fake({ data: [{ ...ROW, auto_rule: null, members: [{ count: 4 }] }, { id: 'l2', name: 'ب', auto_rule: null, members: [] }] });
    expect(await q.all()).toEqual([
      { ...ROW, count: 4, auto_rule: null },
      { id: 'l2', name: 'ب', count: 0, auto_rule: null },
    ]);
    expect(calls).toContainEqual(['order', 'created_at']);
  });

  it('reads the automatic rule of «مشترك» and «معلم»; an unknown value is a hand-kept list', async () => {
    const rows = [
      { id: 'a', name: 'مشترك', auto_rule: 'subscribed', members: [{ count: 2 }] },
      { id: 'b', name: 'معلم', auto_rule: 'teachers', members: [] },
      { id: 'c', name: 'غيرها', auto_rule: 'later', members: [] },
    ];
    expect((await fake({ data: rows }).q.all()).map((l) => l.auto_rule)).toEqual(['subscribed', 'teachers', null]);
    const { q, calls } = fake({ data: rows[0] });
    expect(await q.one('a')).toEqual({ id: 'a', name: 'مشترك', count: 2, auto_rule: 'subscribed' });
    expect(calls).toContainEqual(['select', 'id, name, auto_rule, members:chat_list_threads(count)']);
  });

  it('create: a taken key is `taken`, the cap trigger is `limit`, another check violation throws', async () => {
    expect(await fake({ error: { code: '23505', message: 'dup' } }).q.create({ name: 'x', name_key: 'x', created_by: 'u' })).toBe('taken');
    const cap = { code: '23514', message: 'chat_lists: at most 30 lists' };
    expect(await fake({ error: cap }).q.create({ name: 'x', name_key: 'x', created_by: 'u' })).toBe('limit');
    const other = fake({ error: { code: '23514', message: 'chat_lists_name_check' } });
    await expect(other.q.create({ name: 'x', name_key: 'x', created_by: 'u' })).rejects.toThrow(/chat list create/);
    expect(await fake({ data: ROW }).q.create({ name: 'x', name_key: 'x', created_by: 'u' })).toEqual({ ...ROW, count: 0, auto_rule: null });
  });

  it('rename: no row is null (unknown list), a taken key is `taken`', async () => {
    expect(await fake({ data: [] }).q.rename('l1', { name: 'ب', name_key: 'ب' })).toBeNull();
    expect(await fake({ data: [{ id: 'l1' }] }).q.rename('l1', { name: 'ب', name_key: 'ب' })).toBe('renamed');
    expect(await fake({ error: { code: '23505', message: 'dup' } }).q.rename('l1', { name: 'ب', name_key: 'ب' })).toBe('taken');
  });

  it('adding twice is a no-op upsert; removing filters by list and phone', async () => {
    const add = fake({});
    await add.q.add({ listId: 'l1', phone: '+966501234567', by: 'u' });
    expect(add.calls).toContainEqual([
      'upsert',
      { list_id: 'l1', phone_e164: '+966501234567', added_by: 'u' },
      { onConflict: 'list_id,phone_e164', ignoreDuplicates: true },
    ]);
    const drop = fake({});
    await drop.q.drop('l1', '+966501234567');
    expect(drop.calls).toEqual(expect.arrayContaining([['eq', 'list_id', 'l1'], ['eq', 'phone_e164', '+966501234567']]));
  });

  it('add: a list deleted meanwhile (FK 23503) is `gone`, not a 500', async () => {
    const gone = fake({ error: { code: '23503', message: 'chat_list_threads_list_id_fkey' } });
    expect(await gone.q.add({ listId: 'l1', phone: '+966501234567', by: 'u' })).toBe('gone');
    expect(await fake({}).q.add({ listId: 'l1', phone: '+966501234567', by: 'u' })).toBe('added');
  });

  it('a chat\'s lists come oldest list first, without their timestamps', async () => {
    const data = [
      { list: { id: 'b', name: 'ثانية', created_at: '2026-10-20T10:00:00Z' } },
      { list: { id: 'a', name: 'أولى', created_at: '2026-10-19T10:00:00Z' } },
    ];
    expect(await fake({ data }).q.listsOf('+966501234567')).toEqual([{ id: 'a', name: 'أولى' }, { id: 'b', name: 'ثانية' }]);
  });

  it('a read error throws (500), never an empty answer', async () => {
    await expect(fake({ error: { code: 'XX000', message: 'down' } }).q.all()).rejects.toThrow(/down/);
  });
});
