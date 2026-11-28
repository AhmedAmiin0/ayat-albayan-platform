import { waIdToE164, type CallEvent } from '@ab/shared';
import type { CallWebhookEvent } from '@/modules/messaging/webhook';
import type { CallingLine } from '@/modules/messaging/calls/kapso/calling-line';
import type { CallRow } from '@/modules/messaging/calls/store/call-row';

const STATUS_EVENTS = new Map<string, (at: string) => CallEvent>([
  ['RINGING', () => ({ type: 'ringing' })],
  ['ACCEPTED', (at) => ({ type: 'accepted', at })],
  ['REJECTED', (at) => ({ type: 'rejected', at })],
]);

type KindEvent = (e: CallWebhookEvent, at: string) => CallEvent | null;

/** By item kind: the machine event it stands for, null = nothing to do. */
export const KIND_EVENTS: Readonly<Record<CallWebhookEvent['kind'], KindEvent>> = {
  terminate: (e, at) => ({
    type: 'terminate',
    at,
    failed: e.status === 'FAILED',
    duration: e.duration,
  }),
  connect: (e) => (e.direction === 'outbound' && e.sdp ? { type: 'answer_sdp', sdp: e.sdp } : null),
  status: (e, at) => STATUS_EVENTS.get(e.status ?? '')?.(at) ?? null,
};

/** The item is for the calling number (Meta may leave the phone_number_id out). */
export const onLine = (e: CallWebhookEvent, line: CallingLine): boolean =>
  e.phoneNumberId === null || e.phoneNumberId === line.env.phoneNumberId;

export const isInboundOffer = (e: CallWebhookEvent): boolean =>
  e.kind === 'connect' && e.direction === 'inbound';

export const callerPhone = (e: CallWebhookEvent): string | null =>
  e.peer ? waIdToE164(e.peer) : null;

const STILL_UP: ReadonlySet<CallEvent['type']> = new Set(['ringing', 'accepted', 'answer_sdp']);

/**
 * Our outbound row already ended (a connect that timed out, a hang-up before WhatsApp named the
 * call) but WhatsApp says the call rings, was answered or got its answer: it is still up there, so
 * end it.
 */
export function stillUpOnWhatsapp(
  row: Pick<CallRow, 'direction' | 'status'>,
  event: CallEvent,
): boolean {
  return row.direction === 'outbound' && row.status === 'ended' && STILL_UP.has(event.type);
}
