import type { ActiveCallView, CallView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/http/index.js';
import { callEntryText, callErrorText, callPhaseText, callStatusText, type CallsText } from './call-words.js';

const text: CallsText = {
  status: { connecting: 'connecting', ringing: 'ringing', accepting: 'accepting', ended: 'ended' },
  entry: { outgoing: 'out', incoming: 'in', missed: 'missed', unanswered: 'unanswered', live: 'live' },
  mic: { denied: 'denied', unsupported: 'unsupported' },
  errors: { already_taken: 'taken', no_permission: 'no permission', call_failed: 'failed', media_failed: 'media' },
};

describe('callErrorText', () => {
  it('says the API code in words, and never retries a failed call', () => {
    expect(callErrorText(new ApiError(409, { code: 'already_taken' }), text)).toBe('taken');
    expect(callErrorText(new ApiError(409, { code: 'permission_limited' }), text)).toBe('no permission');
    expect(callErrorText(new ApiError(502, { code: 'call_failed', reason: 'meta_131042' }), text)).toBe('failed');
    expect(callErrorText(new ApiError(500, { code: 'toString' }), text)).toBe('failed');
    expect(callErrorText(new Error('network'), text)).toBe('failed');
  });
});

describe('the call screen status', () => {
  const row = { answered_at: '2026-10-26T10:00:00Z' } as ActiveCallView;
  it('the phase in words; the talked time once active', () => {
    expect(callPhaseText('preparing', text)).toBe('connecting');
    expect(callPhaseText('accepting', text)).toBe('accepting');
    expect(callPhaseText('active', text)).toBe('live');
    expect(callStatusText('ringing', { row, now: 0, text })).toBe('ringing');
    expect(callStatusText('active', { row, now: Date.parse(row.answered_at ?? '') + 134_000, text })).toBe('2:14');
  });
});

describe('callEntryText', () => {
  const call = (patch: Partial<CallView>) =>
    ({ direction: 'outbound', status: 'ended', end_reason: 'completed', duration_seconds: 134, ...patch }) as CallView;
  it('the kind, with the talked time when there was a conversation', () => {
    expect(callEntryText(call({}), text)).toBe('out · 2:14');
    expect(callEntryText(call({ direction: 'inbound', end_reason: 'missed', duration_seconds: null }), text)).toBe('missed');
  });
});
