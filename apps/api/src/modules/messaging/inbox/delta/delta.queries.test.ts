import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { DeltaQueries } from './delta.queries';

const PHONE = '+966500000001';
const ID = 'c0000000-0000-4000-8000-0000000000a1';

describe('DeltaQueries (the delta refresh reads)', () => {
  it('newer: this chat, created after `after`, newest first, limit + 1', async () => {
    const f = fakeDb({ messages: [{ data: [] }] });
    await new DeltaQueries(f.db).newer({ phone: PHONE, after: '2026-10-27T10:00:00.000Z', limit: 50 });
    expect(f.argsOf('messages', 'eq')).toEqual(['phone_e164', PHONE]);
    expect(f.argsOf('messages', 'gt')).toEqual(['created_at', '2026-10-27T10:00:00.000Z']);
    expect(f.argsOf('messages', 'limit')).toEqual([51]);
  });

  it('pending: the passed ids OR this chat’s moving outbound rows — always inside this chat', async () => {
    const f = fakeDb({ messages: [{ data: [] }, { data: [] }] });
    const q = new DeltaQueries(f.db);
    await q.pending({ phone: PHONE, ids: [ID], since: '2026-10-27T09:30:00.000Z' });
    await q.pending({ phone: PHONE, ids: [], since: '2026-10-27T09:30:00.000Z' });
    const ors = f.calls.filter((c) => c.method === 'or').map((c) => c.args[0]);
    const moving = 'and(direction.eq.outbound,status.in.(queued,sent,delivered),created_at.gt."2026-10-27T09:30:00.000Z")';
    expect(ors).toEqual([`id.in.(${ID}),${moving}`, moving]);
    expect(f.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['phone_e164', PHONE], ['phone_e164', PHONE]]);
  });

  it('a failed read throws', async () => {
    const f = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new DeltaQueries(f.db).newer({ phone: PHONE, after: 'x', limit: 1 })).rejects.toThrow('thread delta read failed: boom');
  });
});
