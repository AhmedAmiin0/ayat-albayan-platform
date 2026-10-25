import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickSendLine } from './send-line';
import type { ThreadRow } from '../threads/threads.mapper';

const NOW = new Date('2026-10-12T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const thread = (over: Partial<ThreadRow>) => ({ last_chat_inbound_at: null, last_notifications_inbound_at: null, ...over }) as ThreadRow;

afterEach(() => vi.unstubAllEnvs());

describe('pickSendLine (docs/12 §13.3, R-MEET-02)', () => {
  it('no thread → no_thread; every window closed → session_closed', () => {
    expect(pickSendLine(null, NOW)).toEqual({ code: 'no_thread' });
    expect(pickSendLine(thread({ last_notifications_inbound_at: hoursAgo(25) }), NOW)).toEqual({ code: 'session_closed' });
  });

  it('a single line: an open window queues with no line key', () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    expect(pickSendLine(thread({ last_notifications_inbound_at: hoursAgo(1) }), NOW)).toEqual({});
  });

  it('only the chat window open while the chat line cannot send → line_not_configured', () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    expect(pickSendLine(thread({ last_chat_inbound_at: hoursAgo(1) }), NOW)).toEqual({ code: 'line_not_configured' });
  });
});
