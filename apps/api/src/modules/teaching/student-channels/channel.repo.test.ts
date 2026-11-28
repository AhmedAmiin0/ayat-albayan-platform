import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ChannelRepo } from './channel.repo';

// The chat upgrade's writes: a resend of the same client_id answers the stored row (bug d), and a
// read mark only moves forward (channel_mark_read, bug a).

const ROW = { id: 'm1', body: 'x', created_at: '2026-11-17T10:00:00.123456+00:00' };
const NEW = {
  channel_id: 'c1',
  sender_profile_id: 'p1',
  sender_role: 'teacher',
  body: 'x',
} as const;

function db(insertError: { code: string; message: string } | null) {
  const eqs: [string, string][] = [];
  const q = {
    insert: () => q,
    select: () => q,
    single: async () => ({ data: insertError ? null : ROW, error: insertError }),
    eq: (c: string, v: string) => {
      eqs.push([c, v]);
      return q;
    },
    maybeSingle: async () => ({ data: ROW, error: null }),
  };
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const repo = new ChannelRepo({ from: () => q, rpc } as unknown as Db);
  return { repo, eqs, rpc };
}

describe('ChannelRepo.insert', () => {
  it('a new message: the stored row, created', async () => {
    await expect(db(null).repo.insert(NEW)).resolves.toEqual({ row: ROW, created: true });
  });

  it('the same client_id again (unique violation): the stored row of that sender, not created', async () => {
    const t = db({ code: '23505', message: 'duplicate key' });
    const resend = { ...NEW, client_id: 'a1000000-0000-4000-8000-000000000001' };
    await expect(t.repo.insert(resend)).resolves.toEqual({ row: ROW, created: false });
    expect(t.eqs).toEqual([
      ['channel_id', 'c1'],
      ['sender_profile_id', 'p1'],
      ['client_id', resend.client_id],
    ]);
  });

  it('any other failure, or a duplicate without a client id, still throws', async () => {
    await expect(db({ code: '23514', message: 'check' }).repo.insert(NEW)).rejects.toThrow();
    await expect(db({ code: '23505', message: 'dup' }).repo.insert(NEW)).rejects.toThrow();
  });
});

describe('ChannelRepo.setReadMark', () => {
  it('goes through channel_mark_read with the instant as given (microseconds kept)', async () => {
    const t = db(null);
    await t.repo.setReadMark({ channelId: 'c1', profileId: 'p1', at: ROW.created_at });
    expect(t.rpc).toHaveBeenCalledWith('channel_mark_read', {
      p_channel: 'c1',
      p_profile: 'p1',
      p_at: ROW.created_at,
    });
  });
});
