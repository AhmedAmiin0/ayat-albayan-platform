import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { NumbersRepo } from './numbers.repo';

const row = { label: 'رقم', purpose: 'chat' as const, provider: 'meta' as const, phone_number_id: '1000000002', enabled: false };

describe('NumbersQueries', () => {
  it('a duplicate phone id or a second live default is a 409 in words', async () => {
    const { db } = fakeDb({
      wa_numbers: [
        { error: { code: '23505', message: 'duplicate key value violates unique constraint "wa_numbers_phone_number_id_key"' } },
        { error: { code: '23505', message: 'duplicate key value violates unique constraint "wa_numbers_default_per_purpose"' } },
      ],
    });
    const q = new NumbersRepo(db);
    await expect(q.insert({ row, actorId: 'a' })).rejects.toMatchObject({ status: 409, response: { message: 'phone_taken' } });
    await expect(q.update('id', { patch: { enabled: true }, actorId: 'a' })).rejects.toMatchObject({ response: { message: 'default_taken' } });
  });

  it('defaults() reads only enabled default rows; another error throws', async () => {
    const { db, calls } = fakeDb({ wa_numbers: [{ data: [] }, { error: { message: 'down' } }] });
    const q = new NumbersRepo(db);
    await expect(q.defaults()).resolves.toEqual([]);
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['enabled', true], ['is_default', true]]);
    await expect(q.all()).rejects.toThrow('numbers read failed');
  });

  it('saveHealth matches a phone id, or a crm role (one number when named)', async () => {
    const { db, calls } = fakeDb({ wa_numbers: [{}, {}] });
    const repo = new NumbersRepo(db);
    const health = { health: { ok: true }, checked_at: 't' };
    await repo.saveHealth({ phone_number_id: '1000000001' }, health);
    await repo.saveHealth({ purpose: 'chat', provider: 'crm', id: 'n1' }, health);
    expect(calls.filter((c) => c.method === 'match').map((c) => c.args[0])).toEqual([
      { phone_number_id: '1000000001' }, { purpose: 'chat', provider: 'crm', id: 'n1' },
    ]);
  });
});
