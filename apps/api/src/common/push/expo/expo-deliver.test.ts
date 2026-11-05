import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, okTickets } from '@/common/push/push.fakes';
import { expoDeliver, type PushTransport } from './expo-deliver';

// R-MOB-01: an app push that never left is recorded on its row (never a silent sent_at/error NULL).

const PROFILE = { id: 'p1', push_tokens: ['ExponentPushToken[p]'] };
const TEXT = { title: 'دعوة إلى اجتماع', body: 'x' };

function run(transport: PushTransport) {
  const { db, writes } = fakePushDb([]);
  const delivered = expoDeliver({
    db,
    transport,
    profile: PROFILE,
    rowId: 'r1',
    text: TEXT,
    data: { kind: 'meeting_invite' },
  });
  return { delivered, writes };
}

describe('expoDeliver', () => {
  it('records the tickets and the send time', async () => {
    const { delivered, writes } = run(vi.fn<PushTransport>(async (m) => okTickets(m.length)));
    await delivered;
    expect(writes).toEqual([
      {
        table: 'push_notifications',
        op: 'update',
        value: expect.objectContaining({
          ticket_ids: ['t0'],
          error: null,
          sent_at: expect.any(String),
        }),
      },
    ]);
  });

  it('a failed call: its message on the row, then it rejects; no token dropped', async () => {
    const { delivered, writes } = run(
      vi.fn<PushTransport>(async () => Promise.reject(new Error('expo push HTTP 503'))),
    );
    await expect(delivered).rejects.toThrow('expo push HTTP 503');
    expect(writes).toEqual([
      {
        table: 'push_notifications',
        op: 'update',
        value: expect.objectContaining({
          ticket_ids: [],
          error: 'expo push HTTP 503',
          sent_at: expect.any(String),
        }),
      },
    ]);
  });

  it('a dead token: its binding is deleted, the live one stays', async () => {
    const dead = [
      { status: 'error' as const, message: 'gone', details: { error: 'DeviceNotRegistered' } },
    ];
    const { delivered, writes } = run(vi.fn<PushTransport>(async () => dead));
    await delivered;
    expect(writes.at(-1)).toEqual({
      table: 'push_device_sessions',
      op: 'delete',
      value: ['ExponentPushToken[p]'],
    });
  });
});
