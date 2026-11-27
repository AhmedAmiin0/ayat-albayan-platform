import { describe, expect, it } from 'vitest';
import type { CallRow } from './call-row';
import { toActiveView, toCallView } from './calls.mapper';

const ID = 'c0000000-0000-4000-8000-000000000001';
const STAFF = 'a0000000-0000-4000-8000-000000000001';
const row = (over: Partial<CallRow> = {}): CallRow => ({
  id: ID,
  phone_e164: '+966500000001',
  direction: 'outbound',
  status: 'ringing',
  end_reason: null,
  created_by: STAFF,
  accepted_by: null,
  client_request_id: null,
  wa_call_id: null,
  number_id: null,
  guardian_id: null,
  lead_id: null,
  error_code: null,
  started_at: '2026-10-01T10:00:00.123456+00:00',
  answered_at: null,
  ended_at: null,
  duration_seconds: null,
  updated_at: '2026-10-01T10:00:00+00:00',
  offer_sdp: 'v=0 offer',
  answer_sdp: 'v=0 answer',
  ...over,
});

describe('the call views are checked against their answer schemas', () => {
  it('passes a row that fits, with the SDP only for its own device', () => {
    const names = new Map([['+966500000001', 'أحمد']]);
    expect(toCallView(row(), names).display_name).toBe('أحمد');
    const own = toActiveView(row(), { names, userId: STAFF });
    expect([own.offer_sdp, own.answer_sdp]).toEqual([null, 'v=0 answer']);
    expect(toActiveView(row(), { names, userId: ID }).answer_sdp).toBeNull();
  });

  it('refuses a row with a status the clients do not know instead of sending it', () => {
    expect(() => toCallView(row({ status: 'held' }), new Map())).toThrow('response_invalid');
  });

  it('refuses a row whose number is not E.164 instead of sending it', () => {
    const bad = () => toActiveView(row({ phone_e164: 'unknown' }), { names: new Map(), userId: ID });
    expect(bad).toThrow('response_invalid');
  });
});
