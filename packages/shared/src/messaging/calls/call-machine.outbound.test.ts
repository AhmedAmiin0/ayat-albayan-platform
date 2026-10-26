import { describe, expect, it } from 'vitest';
import { nextCall, type CallState } from './call-machine.js';

const out = (over: Partial<CallState> = {}): CallState => ({
  status: 'connecting', direction: 'outbound', answered_at: null, answer_sdp: null, end_reason: null, duration_seconds: null, ...over,
});
const at = '2026-10-26T10:00:00.000Z';

describe('nextCall, outbound (staff calls the family)', () => {
  it('stores the answer SDP once, at any live status (ACCEPTED may come first)', () => {
    expect(nextCall(out(), { type: 'answer_sdp', sdp: 'v=0 a' })).toEqual({ answer_sdp: 'v=0 a' });
    expect(nextCall(out({ status: 'ringing' }), { type: 'answer_sdp', sdp: 'v=0 a' })).toEqual({ answer_sdp: 'v=0 a' });
    expect(nextCall(out({ status: 'active', answered_at: '2026-10-26T10:00:00Z' }), { type: 'answer_sdp', sdp: 'v=0 a' })).toEqual({ answer_sdp: 'v=0 a' });
    expect(nextCall(out({ answer_sdp: 'v=0 a' }), { type: 'answer_sdp', sdp: 'v=0 b' })).toBeNull();
    expect(nextCall(out({ status: 'ended', end_reason: 'completed' }), { type: 'answer_sdp', sdp: 'v=0 a' })).toBeNull();
  });

  it('rings from connecting only (a duplicate RINGING is ignored)', () => {
    expect(nextCall(out(), { type: 'ringing' })).toEqual({ status: 'ringing' });
    expect(nextCall(out({ status: 'ringing' }), { type: 'ringing' })).toBeNull();
    expect(nextCall(out({ status: 'active' }), { type: 'ringing' })).toBeNull();
  });

  it('ACCEPTED makes it active (even before RINGING arrived), never twice', () => {
    expect(nextCall(out({ status: 'ringing' }), { type: 'accepted', at })).toEqual({ status: 'active', answered_at: at });
    expect(nextCall(out(), { type: 'accepted', at })).toEqual({ status: 'active', answered_at: at });
    expect(nextCall(out({ status: 'active' }), { type: 'accepted', at })).toBeNull();
  });

  it('REJECTED ends an unanswered call as rejected; late, it is ignored', () => {
    expect(nextCall(out({ status: 'ringing' }), { type: 'rejected', at })).toEqual({ status: 'ended', ended_at: at, end_reason: 'rejected' });
    expect(nextCall(out({ status: 'active' }), { type: 'rejected', at })).toBeNull();
  });

  it('terminate: completed with WhatsApp\'s talk time, or no_answer / failed before an answer', () => {
    const active = out({ status: 'active', answered_at: '2026-10-26T09:57:46.000Z' });
    expect(nextCall(active, { type: 'terminate', at, failed: false, duration: 130 })).toEqual({
      status: 'ended', ended_at: at, end_reason: 'completed', duration_seconds: 130,
    });
    expect(nextCall(active, { type: 'terminate', at, failed: false, duration: null })).toMatchObject({ duration_seconds: 134 });
    expect(nextCall(out({ status: 'ringing' }), { type: 'terminate', at, failed: false, duration: null })).toEqual({
      status: 'ended', ended_at: at, end_reason: 'no_answer',
    });
    expect(nextCall(out(), { type: 'terminate', at, failed: true, duration: null })).toMatchObject({ end_reason: 'failed' });
  });

  it('our hang-up: cancelled before an answer, completed after; an explicit reason wins', () => {
    expect(nextCall(out({ status: 'ringing' }), { type: 'hangup', at })).toMatchObject({ end_reason: 'cancelled' });
    expect(nextCall(out({ status: 'active', answered_at: at }), { type: 'hangup', at })).toMatchObject({ end_reason: 'completed', duration_seconds: 0 });
    expect(nextCall(out({ status: 'ringing' }), { type: 'hangup', at, reason: 'no_answer' })).toMatchObject({ end_reason: 'no_answer' });
  });

  it('a claim is for inbound calls only', () => {
    expect(nextCall(out({ status: 'ringing' }), { type: 'claim' })).toBeNull();
  });
});

describe('nextCall, an ended call is final', () => {
  const ended = out({ status: 'ended', end_reason: 'completed' });

  it('ignores every event except WhatsApp\'s talk time, learnt once', () => {
    expect(nextCall(ended, { type: 'ringing' })).toBeNull();
    expect(nextCall(ended, { type: 'accepted', at })).toBeNull();
    expect(nextCall(ended, { type: 'hangup', at })).toBeNull();
    expect(nextCall(ended, { type: 'terminate', at, failed: false, duration: null })).toBeNull();
    expect(nextCall(ended, { type: 'terminate', at, failed: false, duration: 61 })).toEqual({ duration_seconds: 61 });
    expect(nextCall({ ...ended, duration_seconds: 60 }, { type: 'terminate', at, failed: false, duration: 61 })).toBeNull();
    expect(nextCall({ ...ended, end_reason: 'no_answer' }, { type: 'terminate', at, failed: false, duration: 61 })).toBeNull();
  });
});
