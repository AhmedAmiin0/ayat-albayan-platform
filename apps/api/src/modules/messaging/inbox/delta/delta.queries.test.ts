import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { NOT_A_REACTION } from '@/modules/messaging/whatsapp';
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

  it('newer: never a hidden row (a reaction, edit or revoke marker: migration 985)', async () => {
    const f = fakeDb({ messages: [{ data: [] }] });
    const after = '2026-10-27T10:00:00.000Z';
    await new DeltaQueries(f.db).newer({ phone: PHONE, after, limit: 50 });
    expect(f.argsOf('messages', 'or')).toEqual([NOT_A_REACTION]);
    expect(NOT_A_REACTION).toContain('not.in.(reaction,edit,revoke)');
  });

  it('pending: the passed ids OR this chat’s moving or marked rows — always inside this chat', async () => {
    const f = fakeDb({ messages: [{ data: [] }, { data: [] }] });
    const q = new DeltaQueries(f.db);
    await q.pending({ phone: PHONE, ids: [ID], since: '2026-10-27T09:30:00.000Z' });
    await q.pending({ phone: PHONE, ids: [], since: '2026-10-27T09:30:00.000Z' });
    const ors = f.calls.filter((c) => c.method === 'or').map((c) => c.args[0]);
    const moving = 'and(direction.eq.outbound,status.in.(queued,sent,delivered),created_at.gt."2026-10-27T09:30:00.000Z")';
    const at = '"2026-10-27T09:30:00.000Z"';
    const marked = `edited_at.gt.${at},deleted_at.gt.${at},our_reaction_at.gt.${at}`;
    expect(ors).toEqual([`id.in.(${ID}),${moving},${marked}`, `${moving},${marked}`]);
    expect(f.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['phone_e164', PHONE], ['phone_e164', PHONE]]);
  });

  it('a failed read throws', async () => {
    const f = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new DeltaQueries(f.db).newer({ phone: PHONE, after: 'x', limit: 1 })).rejects.toThrow('thread delta read failed: boom');
  });
});
