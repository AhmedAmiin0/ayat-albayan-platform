import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallWebhookEvent } from '../../webhook/webhook.events';
import { ADMIN_ACTOR, FAMILY, LINE, fakeGate, fakeKit } from '../calls.fakes';
import { CallEvents, machineEvent } from './call-events.service';
import { fakeNumberStore } from '../calls-number.fakes';
import { CallsSweeper } from './calls.sweeper';
import { OutboundCalls } from './outbound.service';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => LINE) }));

const AT = new Date('2026-10-26T10:00:00Z');
const ev = (over: Partial<CallWebhookEvent>): CallWebhookEvent => ({
  ...{ kind: 'status', waCallId: 'wacid.OUT', phoneNumberId: 'chat-pn', direction: 'outbound', peer: '201001234567' },
  ...{ sdp: null, ref: null, status: null, duration: null, at: AT },
  ...over,
});

async function placed(on = true) {
  const t = fakeKit();
  const gate = fakeGate({ on });
  const view = await new OutboundCalls(t.kit, fakeGate(), new CallsSweeper(t.kit)).start(ADMIN_ACTOR, { phone: FAMILY, sdp: 'v=0 o', clientRequestId: '33333333-3333-4333-8333-333333333333' });
  return {
    ...t,
    events: new CallEvents(t.kit, gate, new CallsSweeper(t.kit), fakeNumberStore()),
    id: view.id,
  };
}

describe('CallEvents: our outbound call', () => {
  let s: Awaited<ReturnType<typeof placed>>;
  beforeEach(async () => {
    s = await placed();
  });

  it('connect answer → stored once; RINGING → ACCEPTED → terminate COMPLETED with the talk time', async () => {
    await s.events.handle(ev({ kind: 'connect', sdp: 'v=0 answer', ref: s.id }));
    await s.events.handle(ev({ kind: 'connect', sdp: 'v=0 other', ref: s.id }));
    expect(s.queries.rows.get(s.id)?.answer_sdp).toBe('v=0 answer');
    await s.events.handle(ev({ status: 'RINGING', ref: s.id }));
    expect(s.queries.rows.get(s.id)?.status).toBe('ringing');
    await s.events.handle(ev({ status: 'ACCEPTED', ref: s.id }));
    await s.events.handle(ev({ kind: 'terminate', status: 'COMPLETED', duration: 134, ref: s.id }));
    expect(s.queries.rows.get(s.id)).toMatchObject({ status: 'ended', end_reason: 'completed', duration_seconds: 134 });
  });

  it('ignores out-of-order and duplicate items (RINGING after ACCEPTED, a second terminate)', async () => {
    await s.events.handle(ev({ status: 'ACCEPTED' }));
    await s.events.handle(ev({ status: 'RINGING' }));
    expect(s.queries.rows.get(s.id)?.status).toBe('active');
    await s.events.handle(ev({ kind: 'terminate', status: 'COMPLETED', duration: 10 }));
    await s.events.handle(ev({ kind: 'terminate', status: 'FAILED', duration: 99 }));
    expect(s.queries.rows.get(s.id)).toMatchObject({ end_reason: 'completed', duration_seconds: 10 });
  });

  it('REJECTED ends it as rejected; another number\'s item is ignored', async () => {
    await s.events.handle(ev({ status: 'REJECTED', phoneNumberId: 'notifications-pn' }));
    expect(s.queries.rows.get(s.id)?.status).toBe('connecting');
    await s.events.handle(ev({ status: 'REJECTED' }));
    expect(s.queries.rows.get(s.id)).toMatchObject({ status: 'ended', end_reason: 'rejected' });
  });

  it('the answer SDP is kept even when ACCEPTED was processed first', async () => {
    await s.events.handle(ev({ status: 'ACCEPTED', ref: s.id }));
    await s.events.handle(ev({ kind: 'connect', sdp: 'v=0 late answer', ref: s.id }));
    expect(s.queries.rows.get(s.id)).toMatchObject({ status: 'active', answer_sdp: 'v=0 late answer' });
  });

  it('a call our row already ended (lost connect answer, early hang-up) is terminated when WhatsApp says it is up', async () => {
    const row = s.queries.rows.get(s.id);
    if (row) Object.assign(row, { status: 'ended', end_reason: 'failed' });
    await s.events.handle(ev({ status: 'ACCEPTED', ref: s.id }));
    expect(s.api.terminate).toHaveBeenCalledWith(LINE, 'wacid.OUT');
    expect(s.queries.rows.get(s.id)?.status).toBe('ended');
    s.api.terminate.mockClear();
    await s.events.handle(ev({ kind: 'terminate', status: 'COMPLETED', ref: s.id }));
    expect(s.api.terminate).not.toHaveBeenCalled();
  });

  it('an unknown call id changes nothing', async () => {
    await s.events.handle(ev({ waCallId: 'wacid.unknown', status: 'ACCEPTED' }));
    expect(s.queries.rows.get(s.id)?.status).toBe('connecting');
  });
});

describe('CallEvents: an inbound offer', () => {
  const offer = ev({ kind: 'connect', direction: 'inbound', waCallId: 'wacid.IN', sdp: 'v=0 offer' });

  it('rings once (a redelivery is deduped by its wacid), linked to the chat', async () => {
    const { events, queries } = await placed();
    await events.handle(offer);
    await events.handle(offer);
    const rings = [...queries.rows.values()].filter((r) => r.direction === 'inbound');
    expect(rings).toHaveLength(1);
    expect(rings[0]).toMatchObject({ status: 'ringing', phone_e164: FAMILY, offer_sdp: 'v=0 offer', guardian_id: 'g1' });
    await events.handle({ ...offer, kind: 'terminate', status: 'COMPLETED' });
    expect(queries.rows.get(rings[0]?.id ?? '')).toMatchObject({ status: 'ended', end_reason: 'missed' });
  });

  it('does not ring while calls are off, nor without an SDP or a phone', async () => {
    const off = await placed(false);
    await off.events.handle(offer);
    const on = await placed();
    await on.events.handle({ ...offer, sdp: null });
    await on.events.handle({ ...offer, peer: 'abc' });
    for (const q of [off.queries, on.queries]) expect([...q.rows.values()].filter((r) => r.direction === 'inbound')).toHaveLength(0);
  });
});

describe('machineEvent', () => {
  it('maps each webhook item to its machine event', () => {
    expect(machineEvent(ev({ kind: 'terminate', status: 'FAILED' }))).toMatchObject({ type: 'terminate', failed: true });
    expect(machineEvent(ev({ status: 'UNKNOWN' }))).toBeNull();
    expect(machineEvent(ev({ kind: 'connect', direction: 'outbound', sdp: null }))).toBeNull();
  });
});
