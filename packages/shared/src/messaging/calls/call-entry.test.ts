import { describe, expect, it } from 'vitest';
import { callEntryKind, formatCallDuration, isMissedCall, mergeChat } from './call-entry.js';
import type { CallView } from './call-types.js';

const call = (over: Partial<CallView>): Pick<CallView, 'direction' | 'status' | 'end_reason'> => ({
  direction: 'outbound', status: 'ended', end_reason: 'completed', ...over,
});

describe('callEntryKind (the chat bubble and the log row)', () => {
  it('names each WhatsApp-like entry', () => {
    expect(callEntryKind(call({}))).toBe('outgoing');
    expect(callEntryKind(call({ direction: 'inbound' }))).toBe('incoming');
    expect(callEntryKind(call({ direction: 'inbound', end_reason: 'missed' }))).toBe('missed');
    expect(callEntryKind(call({ direction: 'inbound', end_reason: 'declined' }))).toBe('missed');
    expect(callEntryKind(call({ end_reason: 'no_answer' }))).toBe('unanswered');
    expect(callEntryKind(call({ end_reason: 'rejected' }))).toBe('unanswered');
    expect(callEntryKind(call({ status: 'ringing', end_reason: null }))).toBe('live');
    expect(isMissedCall('missed')).toBe(true);
    expect(isMissedCall('unanswered')).toBe(false);
  });
});

describe('formatCallDuration', () => {
  it('prints m:ss, and h:mm:ss past an hour', () => {
    expect(formatCallDuration(7)).toBe('0:07');
    expect(formatCallDuration(134)).toBe('2:14');
    expect(formatCallDuration(3723)).toBe('1:02:03');
    expect(formatCallDuration(-3)).toBe('0:00');
  });
});

describe('mergeChat (call entries merged by time with the messages)', () => {
  const m = (id: string, created_at: string) => ({ id, created_at });
  const c = (id: string, started_at: string) => ({ id, started_at });

  it('orders by time, a message first on a tie', () => {
    const merged = mergeChat(
      [m('m1', '2026-10-26T09:00:00Z'), m('m2', '2026-10-26T11:00:00Z')],
      [c('c2', '2026-10-26T11:00:00Z'), c('c1', '2026-10-26T10:00:00Z')],
    );
    expect(merged.map((e) => (e.kind === 'message' ? e.message.id : e.call.id))).toEqual(['m1', 'c1', 'm2', 'c2']);
  });

  it('leaves out calls before the oldest loaded page', () => {
    const merged = mergeChat([m('m1', '2026-10-26T09:00:00Z')], [c('old', '2026-10-25T09:00:00Z')], { from: '2026-10-26T09:00:00Z' });
    expect(merged).toHaveLength(1);
    expect(mergeChat([], [c('old', '2026-10-25T09:00:00Z')], { from: null })).toHaveLength(1);
  });
});
