import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { RelayRepo } from './relay.repo';

// The relay's row: line notifications, claimed (the worker never sends it), no lead or staff.

const M = 'messages';
const NOW = new Date('2026-11-01T08:00:00Z');
const row = {
  phone: '+966500000001',
  body: 'نص',
  dedupKey: 'script-relay:k',
  numberId: undefined,
  now: NOW,
};

describe('RelayRepo', () => {
  it('insert: an outbound notifications row held by a SENDING lease; nothing that makes a lead or staff', async () => {
    const { db, argsOf } = fakeDb({ [M]: [{ data: { id: 'm1' } }] });
    await expect(new RelayRepo(db).insert(row)).resolves.toEqual({ id: 'm1', waMessageId: null });
    expect(argsOf(M, 'insert')).toEqual([
      {
        direction: 'outbound',
        line: 'notifications',
        phone_e164: '+966500000001',
        body: 'نص',
        dedup_key: 'script-relay:k',
        created_by: null,
        attempts: 1,
        next_attempt_at: '2026-11-01T08:02:00.000Z',
        error_code: 'sending',
      },
    ]);
  });

  it('insert stamps the notifications number in module mode', async () => {
    const { db, argsOf } = fakeDb({ [M]: [{ data: { id: 'm1' } }] });
    await new RelayRepo(db).insert({ ...row, numberId: 'n-1' });
    expect(argsOf(M, 'insert')?.[0]).toMatchObject({ number_id: 'n-1' });
  });

  it('insert: a taken dedup key is null (a retry); any other error throws', async () => {
    const { db } = fakeDb({
      [M]: [{ error: { code: '23505', message: 'dup' } }, { error: { message: 'down' } }],
    });
    const repo = new RelayRepo(db);
    await expect(repo.insert(row)).resolves.toBeNull();
    await expect(repo.insert(row)).rejects.toThrow('down');
  });

  it('sent stamps status, sent_at and the wamid; uncertain holds it; drop deletes it', async () => {
    const { db, calls } = fakeDb({});
    const repo = new RelayRepo(db);
    await repo.sent({ id: 'm1', waMessageId: 'wamid.1', at: NOW });
    await repo.uncertain({ id: 'm1', text: 'CRM HTTP 500' });
    await repo.drop('m2');
    const updates = calls.filter((c) => c.method === 'update').map((c) => c.args[0]);
    expect(updates).toEqual([
      {
        status: 'sent',
        sent_at: NOW.toISOString(),
        wa_message_id: 'wamid.1',
        next_attempt_at: null,
        error_code: null,
        error_text: null,
      },
      {
        status: 'failed',
        next_attempt_at: null,
        error_code: 'uncertain',
        error_text: 'CRM HTTP 500',
      },
    ]);
    expect(calls.some((c) => c.method === 'delete')).toBe(true);
  });
});
