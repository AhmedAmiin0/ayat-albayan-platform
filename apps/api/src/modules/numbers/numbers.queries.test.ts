import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { NumbersQueries } from './numbers.queries';

const row = { label: 'رقم', purpose: 'chat' as const, provider: 'meta' as const, phone_number_id: '1000000002', enabled: false };

describe('NumbersQueries', () => {
  it('a duplicate phone id or a second live default is a 409 in words', async () => {
    const { db } = fakeDb({
      wa_numbers: [
        { error: { code: '23505', message: 'duplicate key value violates unique constraint "wa_numbers_phone_number_id_key"' } },
        { error: { code: '23505', message: 'duplicate key value violates unique constraint "wa_numbers_default_per_purpose"' } },
      ],
    });
    const q = new NumbersQueries(db);
    await expect(q.insert({ row, actorId: 'a' })).rejects.toMatchObject({ status: 409, response: { message: 'phone_taken' } });
    await expect(q.update('id', { patch: { enabled: true }, actorId: 'a' })).rejects.toMatchObject({ response: { message: 'default_taken' } });
  });

  it('defaults() reads only enabled default rows; another error throws', async () => {
    const { db, calls } = fakeDb({ wa_numbers: [{ data: [] }, { error: { message: 'down' } }] });
    const q = new NumbersQueries(db);
    await expect(q.defaults()).resolves.toEqual([]);
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['enabled', true], ['is_default', true]]);
    await expect(q.all()).rejects.toThrow('numbers read failed');
  });

  it('saveHealth updates by phone id', async () => {
    const { db, calls } = fakeDb({ wa_numbers: [{}] });
    await new NumbersQueries(db).saveHealth('1000000001', { health: { ok: true }, checked_at: 't' });
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['phone_number_id', '1000000001']);
  });
});
