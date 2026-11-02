import type { CallEvent } from '@ab/shared';
import type { CallWebhookEvent } from '@/modules/messaging/webhook';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';

/** A `status` item's machine event by Meta's (upper case) status; any other status: nothing. */
const STATUS_EVENTS = new Map<string, (at: string) => CallEvent>([
  ['RINGING', () => ({ type: 'ringing' })],
  ['ACCEPTED', (at) => ({ type: 'accepted', at })],
  ['REJECTED', (at) => ({ type: 'rejected', at })],
]);

type KindEvent = (e: CallWebhookEvent, at: string) => CallEvent | null;

/** Per item kind; a connect is an event only as our outbound call's answer. */
const KIND_EVENTS = {
  terminate: (e, at) => {
    const failed = e.status === 'FAILED';
    return { type: 'terminate', at, failed, duration: e.duration };
  },
  connect: (e) => (e.direction === 'outbound' && e.sdp ? { type: 'answer_sdp', sdp: e.sdp } : null),
  status: (e, at) => STATUS_EVENTS.get(e.status ?? '')?.(at) ?? null,
} satisfies Record<CallWebhookEvent['kind'], KindEvent>;

/** The machine event a webhook item stands for; null = nothing to do (an inbound offer: apart). */
export function machineEvent(e: CallWebhookEvent): CallEvent | null {
  return KIND_EVENTS[e.kind](e, e.at.toISOString());
}

/**
 * Our outbound row already ended (a connect that timed out, a hang-up before WhatsApp named the
 * call) but WhatsApp says the call rings, was answered or got its answer: it is still up there, so
 * end it.
 */
export function stillUpOnWhatsapp(row: CallRow, event: CallEvent): boolean {
  return (
    row.direction === 'outbound' &&
    row.status === 'ended' &&
    ['ringing', 'accepted', 'answer_sdp'].includes(event.type)
  );
}
