import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { CodesRepo } from './codes.repo';

const subject = { kind: 'guardian' as const, id: 'g1' };

describe('CodesQueries (login_codes, migration 771)', () => {
  it('stores only the hash, with the TTL and attempts given, and prunes week-old rows', async () => {
    const { db, calls } = fakeDb({ login_codes: [{}, { data: { id: 'c1' } }] });
    const id = await new CodesRepo(db).insert({
      purpose: 'sign_in', subject, phone: '+966500000001', hash: 'a'.repeat(64), maxAttempts: 5, expiresAt: new Date('2026-10-27T10:10:00Z'),
    });
    expect(id).toBe('c1');
    expect(calls.find((c) => c.method === 'delete')).toBeTruthy();
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual({
      purpose: 'sign_in', subject_kind: 'guardian', subject_id: 'g1', phone_e164: '+966500000001',
      code_hash: 'a'.repeat(64), max_attempts: 5, expires_at: '2026-10-27T10:10:00.000Z',
    });
  });

  it('reads the newest code of the subject for the purposes', async () => {
    const { db, argsOf } = fakeDb({ login_codes: [{ data: { id: 'c2', purpose: 'set_password', phone_e164: '+966500000001' } }] });
    await expect(new CodesRepo(db).latest(subject, ['reset_password', 'set_password'])).resolves.toEqual({ id: 'c2', purpose: 'set_password', phone: '+966500000001' });
    expect(argsOf('login_codes', 'in')).toEqual(['purpose', ['reset_password', 'set_password']]);
    expect(argsOf('login_codes', 'order')).toEqual(['created_at', { ascending: false }]);
  });

  it('takes and spends through the SQL functions', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:login_code_take': [{ data: 'h' }, { data: null }], 'rpc:login_code_spend': [{ data: true }, { data: false }] });
    const q = new CodesRepo(db);
    await expect(q.take('c1')).resolves.toBe('h');
    await expect(q.take('c1')).resolves.toBeNull();
    await expect(q.spend('c1')).resolves.toBe(true);
    await expect(q.spend('c1')).resolves.toBe(false);
    expect(argsOf('rpc:login_code_take', 'rpc')).toEqual([{ p_id: 'c1' }]);
  });

  it('counts the phone\'s codes: 15 minutes, a day, and wrong attempts (a spent code\'s last try was right)', async () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const rows = [
      { created_at: '2026-10-27T11:55:00Z', attempts: 2, used_at: '2026-10-27T11:56:00Z' },
      { created_at: '2026-10-27T09:00:00Z', attempts: 5, used_at: null },
    ];
    const { db } = fakeDb({ login_codes: [{ data: rows }] });
    await expect(new CodesRepo(db).phoneStats('+966500000001', now)).resolves.toEqual({ sentLast15Min: 1, sentLastDay: 2, failedLastDay: 6 });
  });

  it('records the send result: sent_at, or a short error code', async () => {
    const { db, calls } = fakeDb({ login_codes: [{}, {}] });
    const q = new CodesRepo(db);
    await q.delivered('c1', null);
    await q.delivered('c1', 'wa_131026');
    const updates = calls.filter((c) => c.method === 'update').map((c) => Object.keys(c.args[0] as object));
    expect(updates).toEqual([['sent_at'], ['send_error']]);
  });
});
