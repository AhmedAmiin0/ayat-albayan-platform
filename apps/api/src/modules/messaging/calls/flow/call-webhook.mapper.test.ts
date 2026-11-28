import { describe, expect, it } from 'vitest';
import type { CallWebhookEvent } from '@/modules/messaging/webhook';
import { LINE } from '@/modules/messaging/calls/calls.fakes';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';
import {
  callerPhone,
  isInboundOffer,
  KIND_EVENTS,
  onLine,
  stillUpOnWhatsapp,
} from './call-webhook.mapper';

const AT = '2026-10-26T10:00:00.000Z';
const ev = (over: Partial<CallWebhookEvent>): CallWebhookEvent => ({
  ...{ kind: 'status', waCallId: 'wacid.X', phoneNumberId: null, direction: 'outbound' },
  ...{ peer: null, sdp: null, ref: null, status: null, duration: null, at: new Date(AT) },
  ...over,
});
type RowState = Pick<CallRow, 'direction' | 'status'>;
const row = (over: Partial<RowState>): RowState => ({ direction: 'outbound', status: 'ended', ...over });

describe('call webhook items → the call machine', () => {
  it('status items map RINGING / ACCEPTED / REJECTED; any other status is nothing', () => {
    expect(KIND_EVENTS.status(ev({ status: 'RINGING' }), AT)).toEqual({ type: 'ringing' });
    expect(KIND_EVENTS.status(ev({ status: 'ACCEPTED' }), AT)).toEqual({ type: 'accepted', at: AT });
    expect(KIND_EVENTS.status(ev({ status: 'REJECTED' }), AT)).toEqual({ type: 'rejected', at: AT });
    expect(KIND_EVENTS.status(ev({ status: 'constructor' }), AT)).toBeNull();
    expect(KIND_EVENTS.status(ev({ status: null }), AT)).toBeNull();
  });

  it('a terminate carries failed and the talk time; a connect only our answer SDP', () => {
    const end = KIND_EVENTS.terminate(ev({ status: 'COMPLETED', duration: 42 }), AT);
    expect(end).toEqual({ type: 'terminate', at: AT, failed: false, duration: 42 });
    const answer = KIND_EVENTS.connect(ev({ kind: 'connect', sdp: 'v=0' }), AT);
    expect(answer).toEqual({ type: 'answer_sdp', sdp: 'v=0' });
    const inbound = ev({ kind: 'connect', direction: 'inbound', sdp: 'v=0' });
    expect(KIND_EVENTS.connect(inbound, AT)).toBeNull();
  });

  it('onLine: no phone_number_id or the calling line\'s own; another number is not', () => {
    expect(onLine(ev({ phoneNumberId: null }), LINE)).toBe(true);
    expect(onLine(ev({ phoneNumberId: LINE.env.phoneNumberId }), LINE)).toBe(true);
    expect(onLine(ev({ phoneNumberId: 'other-pn' }), LINE)).toBe(false);
  });

  it('isInboundOffer: only an inbound connect', () => {
    expect(isInboundOffer(ev({ kind: 'connect', direction: 'inbound' }))).toBe(true);
    expect(isInboundOffer(ev({ kind: 'connect', direction: 'outbound' }))).toBe(false);
    expect(isInboundOffer(ev({ kind: 'status', direction: 'inbound' }))).toBe(false);
  });

  it('callerPhone: the peer as E.164; no peer or not a phone is null', () => {
    expect(callerPhone(ev({ peer: '201001234567' }))).toBe('+201001234567');
    expect(callerPhone(ev({ peer: null }))).toBeNull();
    expect(callerPhone(ev({ peer: 'abc' }))).toBeNull();
  });

  it('stillUpOnWhatsapp: an ended outbound row that WhatsApp still rings or answered', () => {
    expect(stillUpOnWhatsapp(row({}), { type: 'ringing' })).toBe(true);
    expect(stillUpOnWhatsapp(row({}), { type: 'answer_sdp', sdp: 'v' })).toBe(true);
    expect(stillUpOnWhatsapp(row({}), { type: 'rejected', at: AT })).toBe(false);
    expect(stillUpOnWhatsapp(row({ status: 'ringing' }), { type: 'ringing' })).toBe(false);
    expect(stillUpOnWhatsapp(row({ direction: 'inbound' }), { type: 'ringing' })).toBe(false);
  });
});
