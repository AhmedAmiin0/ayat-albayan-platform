import { describe, expect, it } from 'vitest';
import { replyLine } from './reply-line.js';

// docs/12 §13.3 rule 2: a session text prefers the chat line whenever Meta allows it.
const now = new Date('2026-10-11T12:00:00Z');
const OPEN = '2026-10-11T11:00:00Z'; // 1 h ago: window open
const EDGE = '2026-10-10T12:00:00.001Z'; // 23:59:59.999 ago: still open
const CLOSED = '2026-10-10T12:00:00Z'; // exactly 24 h ago: closed
type At = string | null;

// chat inbound, notifications inbound, chat configured → line
const TABLE: [At, At, boolean, 'chat' | 'notifications' | null][] = [
  [OPEN, OPEN, true, 'chat'],
  [OPEN, null, true, 'chat'],
  [OPEN, CLOSED, true, 'chat'],
  [CLOSED, OPEN, true, 'notifications'],
  [null, OPEN, true, 'notifications'],
  [CLOSED, CLOSED, true, null],
  [null, null, true, null],
  [OPEN, OPEN, false, 'notifications'],
  [null, OPEN, false, 'notifications'],
  [OPEN, null, false, 'chat'],
  [OPEN, CLOSED, false, 'chat'],
  [CLOSED, CLOSED, false, null],
  [null, null, false, null],
];
const CASES = TABLE.map(([chat, notifications, chatConfigured, want]) => ({ chat, notifications, chatConfigured, want }));

describe('replyLine truth table', () => {
  it.each(CASES)('chat=$chat notifications=$notifications configured=$chatConfigured → $want', (c) => {
    expect(replyLine({ lastChatInboundAt: c.chat, lastNotificationsInboundAt: c.notifications, chatConfigured: c.chatConfigured, now })).toBe(c.want);
  });

  it('prefers chat even when the newest inbound is on notifications (a reminder tap)', () => {
    const tap = '2026-10-11T11:01:00Z';
    expect(replyLine({ lastChatInboundAt: OPEN, lastNotificationsInboundAt: tap, chatConfigured: true, now })).toBe('chat');
  });

  it('treats the 24 h edge like sessionWindowOpen and tolerates undefined (an old cache)', () => {
    const input = { lastChatInboundAt: EDGE, lastNotificationsInboundAt: undefined, chatConfigured: true, now };
    expect(replyLine(input)).toBe('chat');
    expect(replyLine({ ...input, lastChatInboundAt: undefined, lastNotificationsInboundAt: EDGE })).toBe('notifications');
  });

  it('single line (no chat stamp, chat unset): the history window is the only one', () => {
    const input = { lastChatInboundAt: null, lastNotificationsInboundAt: OPEN, chatConfigured: false, now };
    expect(replyLine(input)).toBe('notifications');
    expect(replyLine({ ...input, lastNotificationsInboundAt: CLOSED })).toBeNull();
  });
});
