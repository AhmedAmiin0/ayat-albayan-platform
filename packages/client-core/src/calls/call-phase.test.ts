import type { ActiveCallView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { callPhase, deriveCall, endedOnServer, ringingFor, talkedSeconds, UNANSWERED_MS, type CallSession } from './call-phase.js';

const session = (patch: Partial<CallSession> = {}): CallSession => ({
  id: 'c1', phone: '+966501234567', name: 'أم سهيلة', direction: 'outbound', startedAt: 1_000, muted: false, speaker: false, minimised: false, ended: false, ...patch,
});
const row = (patch: Partial<ActiveCallView> = {}): ActiveCallView => ({
  id: 'c1', phone_e164: '+966501234567', direction: 'outbound', status: 'ringing', end_reason: null, display_name: 'أم سهيلة',
  staff_id: 'u1', started_at: '2026-10-26T10:00:00Z', answered_at: null, ended_at: null, duration_seconds: null, offer_sdp: null, answer_sdp: null, ...patch,
});

describe('callPhase', () => {
  it('preparing until the API answered, then the server row decides', () => {
    expect(callPhase(session({ id: null }), undefined)).toBe('preparing');
    expect(callPhase(session(), undefined)).toBe('connecting');
    expect(callPhase(session(), row())).toBe('ringing');
    expect(callPhase(session(), row({ status: 'active' }))).toBe('active');
    expect(callPhase(session({ direction: 'inbound' }), undefined)).toBe('accepting');
    expect(callPhase(session({ ended: true }), row())).toBe('ended');
  });
});

describe('the incoming ring', () => {
  it('rings for inbound ringing calls with an offer, minus the declined ones', () => {
    const ring = row({ id: 'r1', direction: 'inbound', offer_sdp: 'v=0' });
    expect(ringingFor([ring, row()], new Set())).toEqual([ring]);
    expect(ringingFor([ring], new Set(['r1']))).toEqual([]);
    expect(ringingFor([{ ...ring, offer_sdp: null }], new Set())).toEqual([]);
    expect(ringingFor([{ ...ring, status: 'accepting' }], new Set())).toEqual([]);
  });
});

describe('ending', () => {
  it('a poll STARTED after the id that no longer lists the call means it ended; an older slow poll does not', () => {
    expect(endedOnServer({ session: session(), rows: [], pollStartedAt: 20, idAt: 10 })).toBe(true);
    expect(endedOnServer({ session: session(), rows: [], pollStartedAt: 5, idAt: 10 })).toBe(false);
    expect(endedOnServer({ session: session(), rows: [row()], pollStartedAt: 20, idAt: 10 })).toBe(false);
    expect(endedOnServer({ session: session({ id: null }), rows: [], pollStartedAt: 20, idAt: 10 })).toBe(false);
  });

  it('an unanswered outbound call gets the 45 s deadline from its server id; an answered one none', () => {
    const state = { session: session(), dismissed: new Set<string>(), idAt: 10 };
    expect(deriveCall(state, { rows: [row()], startedAt: 20 }).deadline).toBe(10 + UNANSWERED_MS);
    expect(deriveCall(state, { rows: [row({ status: 'active' })], startedAt: 20 }).deadline).toBeNull();
    // Before the server knows the call (mic prompt, POST in flight) no timer runs yet.
    expect(deriveCall({ ...state, session: session({ id: null }) }, { rows: [], startedAt: 20 }).deadline).toBeNull();
    expect(deriveCall({ ...state, session: null }, { rows: [row({ direction: 'inbound', offer_sdp: 'v=0' })], startedAt: 20 }).incoming?.id).toBe('c1');
  });

  it('talk time counts from the server answer', () => {
    expect(talkedSeconds(row({ answered_at: '2026-10-26T10:00:00Z' }), Date.parse('2026-10-26T10:02:14Z'))).toBe(134);
    expect(talkedSeconds(row(), 0)).toBe(0);
  });
});
