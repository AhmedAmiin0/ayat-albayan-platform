import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { NOT_A_REACTION } from '@/modules/messaging/whatsapp';
import { ChatSearchRepo, SCAN_BATCH } from './chat-search.repo';

const PHONE = '+966500000001';
const full = { data: Array.from({ length: SCAN_BATCH }, (_, i) => ({ id: String(i) })) };

describe('ChatSearchRepo.rows', () => {
  it('this chat only, never deleted, hidden or marker rows, newest first; the words never reach SQL', async () => {
    const f = fakeDb({ messages: [{ data: [] }] });
    await new ChatSearchRepo(f.db).rows(PHONE);
    expect(f.argsOf('messages', 'eq')).toEqual(['phone_e164', PHONE]);
    const nulls = f.calls.filter((c) => c.method === 'is').map((c) => c.args);
    expect(nulls).toEqual([['deleted_at', null], ['hidden_at', null]]);
    expect(f.argsOf('messages', 'or')).toEqual([NOT_A_REACTION]);
    expect(f.calls.some((c) => ['ilike', 'like', 'textSearch'].includes(c.method))).toBe(false);
  });

  it('reads in batches until a short one', async () => {
    const f = fakeDb({ messages: [full, { data: [{ id: 'last' }] }] });
    const rows = await new ChatSearchRepo(f.db).rows(PHONE);
    expect(rows).toHaveLength(SCAN_BATCH + 1);
    const ranges = f.calls.filter((c) => c.method === 'range').map((c) => c.args);
    expect(ranges).toEqual([[0, SCAN_BATCH - 1], [SCAN_BATCH, 2 * SCAN_BATCH - 1]]);
  });

  it('a failed read throws', async () => {
    const f = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new ChatSearchRepo(f.db).rows(PHONE)).rejects.toThrow('chat search read failed: boom');
  });
});
