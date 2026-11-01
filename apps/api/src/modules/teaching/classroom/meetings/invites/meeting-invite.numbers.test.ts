import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { CHAT_OFF, CHAT_TWO, NUMBERS } from '@/modules/messaging/inbox/send/send-number.fakes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import type { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { MeetingInviteSender } from './meeting-invite.sender';
import { CLOSED_PHONE, OPEN_PHONE } from './meeting-invites.fakes';

// R-MEET-02 in module mode (docs/23c decision 6): the invite text leaves from the number the family wrote
// to; the codes recorded on the invitee are today's.

const NOW = new Date('2026-10-24T10:00:00Z');
const FRESH = new Date(NOW.getTime() - 3_600_000).toISOString();
const OLD = '2026-01-01T00:00:00Z';

function setup(windows: () => Promise<unknown>) {
  const thread = { phone_e164: OPEN_PHONE, lead_id: null, guardian_id: 'g1', last_chat_inbound_at: null, last_notifications_inbound_at: OLD };
  const threads = { thread: vi.fn().mockResolvedValue(thread), enqueue: vi.fn().mockResolvedValue({ id: 'm1' }), numberWindows: vi.fn(windows) };
  const sender = new MeetingInviteSender(
    {} as PushService,
    threads as unknown as ThreadsRepo,
    { kick: vi.fn() } as unknown as MessageSender,
    threads as unknown as ThreadMessagesRepo,
  );
  const send = (phone = OPEN_PHONE) =>
    sender.chat({ phone, body: 'دعوة', dedupKey: 'k', actorId: 'a', teacherId: null, expiresAt: FRESH, now: NOW });
  return { threads, send };
}

afterEach(() => setNumbersOverlay(null));

describe('meeting invite chat per number', () => {
  it('queues with number_id + line of the open window', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: NUMBERS });
    const { threads, send } = setup(async () => [{ numberId: CHAT_TWO.id, line: 'chat', lastInboundAt: FRESH }]);
    expect(await send()).toEqual({ status: 'sent', channel: 'whatsapp', error_code: null });
    expect(threads.numberWindows).toHaveBeenCalledWith(OPEN_PHONE);
    expect(threads.enqueue).toHaveBeenCalledWith(expect.objectContaining({ number_id: 'num-chat-2', line: 'chat' }));
  });

  it('records today\'s codes: line_not_configured, session_closed, and a failed read fails closed', async () => {
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: NUMBERS });
    const off = setup(async () => [{ numberId: CHAT_OFF.id, line: 'chat', lastInboundAt: FRESH }]);
    expect(await off.send()).toEqual({ status: 'window_closed', channel: 'link', error_code: 'line_not_configured' });
    const shut = setup(async () => []);
    expect(await shut.send(CLOSED_PHONE)).toEqual({ status: 'window_closed', channel: 'link', error_code: 'session_closed' });
    const down = setup(async () => Promise.reject(new Error('db down')));
    expect(await down.send()).toEqual({ status: 'window_closed', channel: 'link', error_code: 'line_not_configured' });
    for (const s of [off, shut, down]) expect(s.threads.enqueue).not.toHaveBeenCalled();
  });

  it('legacy: no windows read, no number_id', async () => {
    const { threads, send } = setup(async () => []);
    threads.thread.mockResolvedValue({ phone_e164: OPEN_PHONE, lead_id: null, guardian_id: 'g1', last_chat_inbound_at: null, last_notifications_inbound_at: FRESH });
    expect((await send()).status).toBe('sent');
    expect(threads.numberWindows).not.toHaveBeenCalled();
    expect(threads.enqueue.mock.calls[0]?.[0]).not.toHaveProperty('number_id');
  });
});
