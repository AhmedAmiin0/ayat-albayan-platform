import { describe, expect, it } from 'vitest';
import type { CallWebhookEvent } from '@/modules/messaging/webhook';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';
import { machineEvent, stillUpOnWhatsapp } from './call-machine-event';

const AT = new Date('2026-11-01T10:00:00Z');
const at = AT.toISOString();
const ev = (over: Partial<CallWebhookEvent>): CallWebhookEvent => ({
  ...{ kind: 'status', waCallId: 'wacid.1', phoneNumberId: 'pn', direction: 'outbound', peer: null },
  ...{ sdp: null, ref: null, status: null, duration: null, at: AT },
  ...over,
});

describe('machineEvent: one entry per kind and status', () => {
  it.each([
    [{ status: 'RINGING' }, { type: 'ringing' }],
    [{ status: 'ACCEPTED' }, { type: 'accepted', at }],
    [{ status: 'REJECTED' }, { type: 'rejected', at }],
    [{ kind: 'terminate', status: 'COMPLETED', duration: 42 }, { type: 'terminate', at, failed: false, duration: 42 }],
    [{ kind: 'terminate', status: 'FAILED' }, { type: 'terminate', at, failed: true, duration: null }],
    [{ kind: 'connect', sdp: 'v=0' }, { type: 'answer_sdp', sdp: 'v=0' }],
  ] as const)('%o', (over, event) => {
    expect(machineEvent(ev(over))).toEqual(event);
  });

  it.each([
    [{ status: null }],
    [{ status: 'COMPLETED' }],
    [{ status: 'toString' }],
    [{ kind: 'connect', direction: 'inbound', sdp: 'v=0' }],
  ] as const)('nothing for %o', (over) => {
    expect(machineEvent(ev(over))).toBeNull();
  });
});

describe('stillUpOnWhatsapp', () => {
  const ended = { direction: 'outbound', status: 'ended' } as CallRow;

  it('an ended outbound row WhatsApp still rings or answers', () => {
    expect(stillUpOnWhatsapp(ended, { type: 'ringing' })).toBe(true);
    expect(stillUpOnWhatsapp(ended, { type: 'accepted', at })).toBe(true);
  });

  it('not for an inbound row, a live row or a terminate', () => {
    expect(stillUpOnWhatsapp({ ...ended, direction: 'inbound' }, { type: 'ringing' })).toBe(false);
    expect(stillUpOnWhatsapp({ ...ended, status: 'ringing' } as CallRow, { type: 'ringing' })).toBe(false);
    expect(stillUpOnWhatsapp(ended, { type: 'terminate', at, failed: false, duration: null })).toBe(false);
  });
});
