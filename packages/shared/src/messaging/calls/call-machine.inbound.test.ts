import { describe, expect, it } from 'vitest';
import { isLiveCall, nextCall, talkSeconds, type CallState } from './call-machine.js';

const inb = (over: Partial<CallState> = {}): CallState => ({
  status: 'ringing', direction: 'inbound', answered_at: null, answer_sdp: null, end_reason: null, duration_seconds: null, ...over,
});
const at = '2026-10-26T10:00:00.000Z';

describe('nextCall, inbound (the family calls the academy)', () => {
  it('the first claim takes a ringing call; a second claim is refused', () => {
    expect(nextCall(inb(), { type: 'claim' })).toEqual({ status: 'accepting' });
    expect(nextCall(inb({ status: 'accepting' }), { type: 'claim' })).toBeNull();
    expect(nextCall(inb({ status: 'active' }), { type: 'claim' })).toBeNull();
  });

  it('accepted only after a claim', () => {
    expect(nextCall(inb({ status: 'accepting' }), { type: 'accepted', at })).toEqual({ status: 'active', answered_at: at });
    expect(nextCall(inb(), { type: 'accepted', at })).toBeNull();
  });

  it('ignores the outbound-only events', () => {
    expect(nextCall(inb(), { type: 'answer_sdp', sdp: 'v=0' })).toBeNull();
    expect(nextCall(inb(), { type: 'ringing' })).toBeNull();
    expect(nextCall(inb(), { type: 'rejected', at })).toBeNull();
  });

  it('terminate before anyone answered (or while accepting) is a missed call', () => {
    expect(nextCall(inb(), { type: 'terminate', at, failed: false, duration: null })).toMatchObject({ end_reason: 'missed' });
    expect(nextCall(inb({ status: 'accepting' }), { type: 'terminate', at, failed: true, duration: null })).toMatchObject({ end_reason: 'missed' });
  });

  it('a staff decline is «declined»; a hang-up after answering is completed', () => {
    expect(nextCall(inb(), { type: 'hangup', at })).toMatchObject({ end_reason: 'declined' });
    expect(nextCall(inb({ status: 'active', answered_at: '2026-10-26T09:59:00.000Z' }), { type: 'hangup', at })).toMatchObject({
      end_reason: 'completed', duration_seconds: 60,
    });
  });
});

describe('helpers', () => {
  it('talkSeconds is null before an answer and never negative', () => {
    expect(talkSeconds(null, at)).toBeNull();
    expect(talkSeconds('2026-10-26T10:00:05.000Z', at)).toBe(0);
    expect(talkSeconds('bad', at)).toBeNull();
  });

  it('isLiveCall', () => {
    expect(isLiveCall('ringing')).toBe(true);
    expect(isLiveCall('ended')).toBe(false);
  });
});
