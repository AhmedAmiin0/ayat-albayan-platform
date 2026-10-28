import { describe, expect, it } from 'vitest';
import { threadRow } from '../inbox.fakes';
import { messagingWindowOpen } from './threads.mapper';

// docs/28 §10: a message to the calls number opens no messaging window (the composer and reopen follow it).

const NOW = new Date('2026-10-27T12:00:00Z');
const HOUR_AGO = '2026-10-27T11:00:00Z';
const OLD = '2026-10-20T11:00:00Z';

describe('messagingWindowOpen', () => {
  it('newest inbound on the calls number: only the line windows count', () => {
    expect(messagingWindowOpen(threadRow({ last_inbound_at: HOUR_AGO, last_inbound_line: 'calls', last_chat_inbound_at: OLD, last_notifications_inbound_at: OLD }), NOW)).toBe(false);
    expect(messagingWindowOpen(threadRow({ last_inbound_at: HOUR_AGO, last_inbound_line: 'calls', last_chat_inbound_at: '2026-10-27T10:00:00Z', last_notifications_inbound_at: null }), NOW)).toBe(true);
  });

  it('any other newest inbound: the newest inbound as before', () => {
    expect(messagingWindowOpen(threadRow({ last_inbound_at: HOUR_AGO, last_inbound_line: 'chat' }), NOW)).toBe(true);
    expect(messagingWindowOpen(threadRow({ last_inbound_at: OLD, last_inbound_line: null }), NOW)).toBe(false);
  });
});
