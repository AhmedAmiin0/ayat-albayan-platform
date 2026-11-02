import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { NOT_A_REACTION } from '@/modules/messaging/whatsapp';
import { ChatSearchRepo, SCAN_BATCH } from './chat-search.repo';

const PHONE = '+966500000001';
const AT = '2026-10-01T00:00:00.000Z';
const row = (i: number) => ({ id: String(i), created_at: AT });
const full = { data: Array.from({ length: SCAN_BATCH }, (_, i) => row(i)) };

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

  it('reads keyset batches (up to the oldest time seen) until a short one, each row once', async () => {
    const again = { data: [{ id: String(SCAN_BATCH - 1), created_at: AT }, { id: 'last', created_at: AT }] };
    const f = fakeDb({ messages: [full, again] });
    const rows = await new ChatSearchRepo(f.db).rows(PHONE);
    expect(rows).toHaveLength(SCAN_BATCH + 1);
    expect(f.calls.filter((c) => c.method === 'lte').map((c) => c.args)).toEqual([['created_at', AT]]);
    expect(f.calls.some((c) => c.method === 'range')).toBe(false);
  });

  it('a failed read throws', async () => {
    const f = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new ChatSearchRepo(f.db).rows(PHONE)).rejects.toThrow('chat search read failed: boom');
  });
});
