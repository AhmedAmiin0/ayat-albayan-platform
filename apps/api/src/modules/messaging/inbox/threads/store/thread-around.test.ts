import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ThreadMessagesRepo } from './thread-messages.repo';

const PHONE = '+966500000001';
const HIT = { id: 'b0000000-0000-4000-8000-000000000050', created_at: '2026-03-01T10:00:00.123456+00:00' };
const rows = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, created_at: HIT.created_at }));

/** The hit read, then the newer and the older side (each in its own order, as PostgREST sends). */
function windowDb(newer: number, older: number) {
  return fakeDb({ messages: [{ data: HIT }, { data: rows('n', newer) }, { data: rows('o', older) }] });
}

const around = (limit: number) => ({ phone: PHONE, around: HIT.id, limit });

describe('ThreadMessagesRepo.messages around a message (docs/37 NEW 3)', () => {
  it('newer (≤20, ascending, reversed) then the hit and older rows filling limit + 1', async () => {
    const { db } = windowDb(20, 51);
    const got = await new ThreadMessagesRepo(db).messages(around(50));
    expect(got).toHaveLength(51);
    expect(got[0]?.id).toBe('n19');
    expect(got[19]?.id).toBe('n0');
    expect(got[20]?.id).toBe('o0');
    // limit 50: rows.slice(0, 50) shows the page and has_more (51 > 50) says older ones exist.
  });

  it('with only 3 newer rows the older side fills the page, has_more still right', async () => {
    const many = await new ThreadMessagesRepo(windowDb(3, 51).db).messages(around(50));
    expect(many).toHaveLength(51);
    const few = await new ThreadMessagesRepo(windowDb(3, 10).db).messages(around(50));
    expect(few).toHaveLength(13);
  });

  it('range scans from the hit: gte + strict keyset newer, lte + keyset older (quoted)', async () => {
    const { db, calls } = windowDb(0, 1);
    await new ThreadMessagesRepo(db).messages(around(50));
    const at = `"${HIT.created_at}"`;
    expect(calls.filter((c) => c.method === 'gte').map((c) => c.args)).toEqual([['created_at', HIT.created_at]]);
    expect(calls.filter((c) => c.method === 'lte').map((c) => c.args)).toEqual([['created_at', HIT.created_at]]);
    const ors = calls.filter((c) => c.method === 'or').map((c) => c.args[0]);
    expect(ors).toContain(`created_at.gt.${at},and(created_at.eq.${at},id.gt.${HIT.id})`);
    expect(ors).toContain(`created_at.lt.${at},and(created_at.eq.${at},id.lte.${HIT.id})`);
    expect(calls.filter((c) => c.method === 'eq' && c.args[0] === 'phone_e164')).toHaveLength(3);
  });

  it('a small limit keeps the hit on the page: newer capped at limit - 1 (never a negative limit)', async () => {
    const { db, calls } = windowDb(4, 6);
    const got = await new ThreadMessagesRepo(db).messages(around(5));
    expect(calls.filter((c) => c.method === 'limit').map((c) => c.args[0])).toEqual([4, 6]);
    expect(got.map((r) => r.id)).toEqual(['n3', 'n2', 'n1', 'n0', 'o0', 'o1']);
    const one = windowDb(0, 2);
    await new ThreadMessagesRepo(one.db).messages(around(1));
    expect(one.calls.filter((c) => c.method === 'limit').map((c) => c.args[0])).toEqual([0, 2]);
  });

  it('an id of another chat (or a marker) is 404 message_not_found, nothing else read', async () => {
    const { db, trips } = fakeDb({ messages: [{ data: null }] });
    const read = new ThreadMessagesRepo(db).messages(around(50));
    await expect(read).rejects.toBeInstanceOf(NotFoundException);
    await expect(read).rejects.toMatchObject({ response: { code: 'message_not_found' } });
    expect(trips).toEqual(['messages']);
  });
});
