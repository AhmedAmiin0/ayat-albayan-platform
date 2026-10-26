import { afterEach, describe, expect, it, vi } from 'vitest';
import { threadRow } from '../inbox.fakes';
import { threadReplyLine, toThreadView } from './threads.mapper';

// docs/12 §13.3 rule 2 / §13.7: reply_line = the line ThreadSendService.text would stamp.
const NOW = new Date('2026-10-02T09:00:00Z');
const CHAT = '2026-10-02T08:00:00Z';
const TAP = '2026-10-02T08:01:00Z';

function chatConfigured(): void {
  vi.stubEnv('WA_API_BASE', 'http://wa-stub.test');
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', 'chat-phone');
  vi.stubEnv('WA_CHAT_WABA_ID', 'chat-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'token');
}
function chatUnset(): void {
  vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
  vi.stubEnv('WA_CHAT_WABA_ID', '');
}
const both = threadRow({ last_inbound_at: TAP, last_inbound_line: 'notifications', last_chat_inbound_at: CHAT, last_notifications_inbound_at: TAP });
const chatOnly = threadRow({ last_inbound_at: CHAT, last_inbound_line: 'chat', last_chat_inbound_at: CHAT, last_notifications_inbound_at: null });

describe('toThreadView reply_line', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('passes both per-line instants through', () => {
    const v = toThreadView(both, NOW);
    expect([v.last_chat_inbound_at, v.last_notifications_inbound_at, v.last_inbound_line]).toEqual([CHAT, TAP, 'notifications']);
  });

  it('prefers chat after a reminder tap on notifications; the badge keeps the newest line', () => {
    chatConfigured();
    expect(toThreadView(both, NOW).reply_line).toBe('chat');
    expect(toThreadView(threadRow({ last_inbound_at: TAP, last_notifications_inbound_at: TAP }), NOW).reply_line).toBe('notifications');
  });

  it('null once every window is closed', () => {
    chatConfigured();
    expect(toThreadView(both, new Date('2026-10-03T09:00:00Z')).reply_line).toBeNull();
  });

  it('single line: null (no note), but chat when only the chat window is open (the reply is 503)', () => {
    chatUnset();
    expect(toThreadView(threadRow({ last_inbound_at: TAP }), NOW).reply_line).toBeNull();
    expect(toThreadView(both, NOW).reply_line).toBeNull();
    expect(toThreadView(chatOnly, NOW).reply_line).toBe('chat');
  });

  it('threadReplyLine is replyLine over the view columns', () => {
    expect(threadReplyLine(both, { chatConfigured: false, now: NOW })).toBe('notifications');
    expect(threadReplyLine(both, { chatConfigured: true, now: NOW })).toBe('chat');
  });
});
