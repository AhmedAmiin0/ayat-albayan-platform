import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChannelActor } from '@/modules/teaching/student-channels/channel-access';
import type { ChannelNotify } from '@/modules/teaching/student-channels/channel-notify';
import type { ChannelRepo } from '@/modules/teaching/student-channels/channel.repo';
import type { ChannelViews } from '@/modules/teaching/student-channels/views/channel-views.service';
import { ChannelSender } from './channel-sender';
import type { ChannelSendInputs } from './channel-send-inputs';
import type { NewChannelMessage } from './channel-row';

// Review finding 7: the send answers once the row is stored and the read mark is set; the
// notification fan-out (members, names, settings, bell rows) runs off the request path and a
// failure there is logged, never lost and never a 500.

const ACTOR: ChannelActor = {
  mode: 'participant',
  studentId: 'st1',
  profileId: 'p-t',
  role: 'teacher',
  open: true,
};

function sender(sent: ChannelNotify['sent']) {
  const queries = {
    channelOf: vi.fn(async () => 'ch1'),
    byClientId: vi.fn(async () => null),
    insert: vi.fn(async (row: NewChannelMessage) => ({
      row: { id: 'm1', created_at: '2026-11-21T10:00:00.000Z', ...row },
      created: true,
    })),
    setReadMark: vi.fn(async () => undefined),
  };
  const notify = { sent: vi.fn(sent) };
  const views = {
    safeContext: vi.fn(async () => ({ me: 'p-t', names: new Map<string, string>() })),
  };
  const s = new ChannelSender(
    queries as unknown as ChannelRepo,
    { columns: vi.fn(async () => ({})) } as unknown as ChannelSendInputs,
    notify as unknown as ChannelNotify,
    views as unknown as ChannelViews,
  );
  return { s, notify, queries };
}

afterEach(() => vi.restoreAllMocks());

describe('ChannelSender: the notification fan-out is off the request path', () => {
  it('answers while the notify is still running; the notify was started with the stored row', async () => {
    const { s, notify, queries } = sender(() => new Promise<void>(() => undefined));
    const view = await s.post(ACTOR, { body: 'السلام عليكم' });
    expect(view).toMatchObject({ id: 'm1', body: 'السلام عليكم', mine: true });
    expect(queries.setReadMark).toHaveBeenCalledTimes(1);
    expect(notify.sent).toHaveBeenCalledWith(ACTOR, expect.objectContaining({ id: 'm1' }));
  });

  it('a notify failure is logged, the send still answers', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { s } = sender(async () => {
      throw new Error('push down');
    });
    await expect(s.post(ACTOR, { body: 'x' })).resolves.toMatchObject({ id: 'm1' });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('push down')));
  });

  it('a resend (same client_id, already stored) notifies nobody again', async () => {
    const { s, notify, queries } = sender(async () => undefined);
    const stored = {
      id: 'm0',
      body: 'x',
      sender_profile_id: 'p-t',
      sender_role: 'teacher',
      created_at: '',
    };
    queries.byClientId.mockResolvedValueOnce(stored as never);
    await s.post(ACTOR, { body: 'x', client_id: 'a1000000-0000-4000-8000-000000000001' });
    expect(notify.sent).not.toHaveBeenCalled();
  });
});
