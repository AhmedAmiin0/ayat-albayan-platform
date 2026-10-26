import type { CallDirection, CallEndReason, CallStatus } from './call-types.js';

// The call state machine (docs/28 §3), one truth for the API (webhook, routes, sweeper). Statuses only
// move forward (connecting → ringing → accepting → active → ended); an event that would move one back,
// repeat a step or touch an ended call is ignored (null), so WhatsApp's retries and out-of-order
// webhooks are harmless. The caller writes the patch compare-and-set on the status it read.

/** What the machine reads of a wa_calls row. */
export interface CallState {
  status: CallStatus;
  direction: CallDirection;
  answered_at: string | null;
  answer_sdp: string | null;
  end_reason: CallEndReason | null;
  duration_seconds: number | null;
}

export type CallEvent =
  /** Outbound: the connect webhook brought WhatsApp's SDP answer (stored once, whatever the live status). */
  | { type: 'answer_sdp'; sdp: string }
  /** Outbound: status RINGING (the family's phone rings). */
  | { type: 'ringing' }
  /** Outbound: status ACCEPTED; inbound: our accept went through. */
  | { type: 'accepted'; at: string }
  /** Outbound: status REJECTED (the family declined). */
  | { type: 'rejected'; at: string }
  /** The terminate webhook (either direction); `failed` = Meta's status «Failed». */
  | { type: 'terminate'; at: string; failed: boolean; duration: number | null }
  /** Inbound: one staff member takes the ringing call (the first one wins). */
  | { type: 'claim' }
  /** Ended from our side: hang up, decline, the unanswered timeout or a refused request. */
  | { type: 'hangup'; at: string; reason?: CallEndReason };

export interface CallPatch {
  status?: CallStatus;
  answer_sdp?: string;
  answered_at?: string;
  ended_at?: string;
  end_reason?: CallEndReason;
  duration_seconds?: number;
}

const RANK: Record<CallStatus, number> = { connecting: 0, ringing: 1, accepting: 2, active: 3, ended: 4 };

/** Whole seconds from the answer to `at` (never negative); null when it was never answered. */
export function talkSeconds(answeredAt: string | null, at: string): number | null {
  if (!answeredAt) return null;
  const ms = Date.parse(at) - Date.parse(answeredAt);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : null;
}

/** How a call that ends now (not by our own choice) is remembered. */
function endedReason(call: CallState, failed: boolean): CallEndReason {
  if (call.status === 'active') return 'completed';
  if (call.direction === 'inbound') return 'missed';
  return failed ? 'failed' : 'no_answer';
}

/** The ended patch: talk time only when it was answered. */
function ending(call: CallState, at: { at: string; reason: CallEndReason; duration?: number | null }): CallPatch {
  const talk = call.status === 'active' ? (at.duration ?? talkSeconds(call.answered_at, at.at)) : null;
  return { status: 'ended', ended_at: at.at, end_reason: at.reason, ...(talk === null ? {} : { duration_seconds: talk }) };
}

/** Our own hang-up: completed once talking, else cancelled (outbound) or declined (inbound). */
function hangupReason(call: CallState, reason: CallEndReason | undefined): CallEndReason {
  if (reason) return reason;
  if (call.status === 'active') return 'completed';
  return call.direction === 'outbound' ? 'cancelled' : 'declined';
}

/** An ended call only learns WhatsApp's own talk time, once, when we ended it first. */
function afterEnd(call: CallState, event: CallEvent): CallPatch | null {
  if (event.type !== 'terminate' || event.duration === null) return null;
  return call.end_reason === 'completed' && call.duration_seconds === null ? { duration_seconds: event.duration } : null;
}

type Step<K extends CallEvent['type']> = (call: CallState, event: Extract<CallEvent, { type: K }>) => CallPatch | null;

const outbound = (call: CallState): boolean => call.direction === 'outbound';
/** Before anyone answered (connecting or ringing). */
const early = (call: CallState): boolean => RANK[call.status] <= RANK.ringing;

/** One rule per event; each returns null when the event does not apply to this call now. */
const STEPS: { [K in CallEvent['type']]: Step<K> } = {
  // Any live moment: Meta may send the connect answer after (or with) ACCEPTED; dropping it would mean no audio.
  answer_sdp: (call, e) => (outbound(call) && call.answer_sdp === null ? { answer_sdp: e.sdp } : null),
  ringing: (call) => (outbound(call) && call.status === 'connecting' ? { status: 'ringing' } : null),
  accepted: (call, e) =>
    (outbound(call) ? early(call) : call.status === 'accepting') ? { status: 'active', answered_at: e.at } : null,
  rejected: (call, e) => (outbound(call) && early(call) ? ending(call, { at: e.at, reason: 'rejected' }) : null),
  claim: (call) => (!outbound(call) && call.status === 'ringing' ? { status: 'accepting' } : null),
  terminate: (call, e) => ending(call, { at: e.at, reason: endedReason(call, e.failed), duration: e.duration }),
  hangup: (call, e) => ending(call, { at: e.at, reason: hangupReason(call, e.reason) }),
};

/** The patch `event` makes on `call`, or null when it must be ignored (duplicate, late, wrong side). */
export function nextCall(call: CallState, event: CallEvent): CallPatch | null {
  if (call.status === 'ended') return afterEnd(call, event);
  const step = STEPS[event.type] as Step<CallEvent['type']>;
  return step(call, event);
}

/** Not ended yet: the call still rings or talks somewhere. */
export const isLiveCall = (status: CallStatus): boolean => status !== 'ended';
