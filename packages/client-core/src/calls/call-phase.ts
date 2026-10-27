import type { ActiveCallView, CallDirection } from '@ab/shared';

// The call's rules (docs/28 §5), shared by web and mobile (docs/27 §3.4): pure, no React, no WebRTC.

/** A chat to call: its number and the name the call screen shows. */
export interface CallTarget {
  phone: string;
  name: string;
}

/** The call this device is in (docs/28 §5); `id` is null until POST /calls answered. */
export interface CallSession {
  id: string | null;
  phone: string;
  name: string;
  direction: CallDirection;
  /** Date.now() when the user tapped (outbound) or accepted (inbound). */
  startedAt: number;
  muted: boolean;
  /** «مكبر الصوت»: the call plays through the loudspeaker instead of the earpiece. */
  speaker: boolean;
  minimised: boolean;
  /** Set once the server stopped listing the call (it ended), for the short «انتهت المكالمة». */
  ended: boolean;
}

/** preparing = the microphone and the offer; connecting / ringing / active from the server row. */
export type CallPhase = 'preparing' | 'connecting' | 'ringing' | 'accepting' | 'active' | 'ended';

/** What the screen shows for the session, its server row merged in (the row wins once it exists). */
export function callPhase(session: CallSession, row: ActiveCallView | undefined): CallPhase {
  if (session.ended) return 'ended';
  if (!row) return session.direction === 'inbound' ? 'accepting' : session.id ? 'connecting' : 'preparing';
  if (row.status === 'ended') return 'ended';
  return row.status;
}

/** Whole seconds talked, from the server's answer time (the same clock for every viewer). */
export function talkedSeconds(row: ActiveCallView | undefined, now: number): number {
  if (!row?.answered_at) return 0;
  return Math.max(0, Math.floor((now - Date.parse(row.answered_at)) / 1000));
}

/** An outbound call still unanswered after this is ended from the client too (the API's sweeper also does). */
export const UNANSWERED_MS = 45_000;

const isUnanswered = (phase: CallPhase): boolean => phase === 'preparing' || phase === 'connecting' || phase === 'ringing';

/** The inbound calls ringing for this user that they have not declined here. */
export function ringingFor(rows: readonly ActiveCallView[], dismissed: ReadonlySet<string>): ActiveCallView[] {
  return rows.filter((r) => r.direction === 'inbound' && r.status === 'ringing' && !!r.offer_sdp && !dismissed.has(r.id));
}

/**
 * The session's call has ended on the server when a poll that STARTED after we learnt its id no
 * longer lists it (/calls/active lists live calls only); an older, slow poll proves nothing.
 */
export function endedOnServer(input: { session: CallSession | null; rows: readonly ActiveCallView[]; pollStartedAt: number; idAt: number }): boolean {
  const { session } = input;
  if (!session?.id || session.ended || input.pollStartedAt <= input.idAt) return false;
  return !input.rows.some((r) => r.id === session.id);
}

/** Everything the screens read off one poll of /calls/active, for the session in hand. */
export interface CallDerived {
  row: ActiveCallView | undefined;
  phase: CallPhase | null;
  /** The server stopped listing our call (it ended). */
  gone: boolean;
  /** When an unanswered outbound call is ended from here (Date.now() ms); null = no timer. */
  deadline: number | null;
  incoming: ActiveCallView | undefined;
  /** WhatsApp's answer to our offer (the connect webhook), once it arrived. */
  answer: string | null;
  /** Calls are off for this user (`enabled` false) while a call is live: it must end. */
  off: boolean;
}

/** Our outbound call that nobody answered yet (the 45 s timer runs). */
const outboundWaiting = (session: CallSession | null, phase: CallPhase | null): boolean =>
  session?.direction === 'outbound' && phase !== null && isUnanswered(phase);

/** Calls are off for this user while a call of theirs is live (not the short «انتهت»). */
const liveWhileOff = (session: CallSession | null, enabled: boolean | undefined): boolean => enabled === false && session !== null && !session.ended;

export function deriveCall(
  state: { session: CallSession | null; dismissed: ReadonlySet<string>; idAt: number },
  poll: { rows: readonly ActiveCallView[]; startedAt: number; enabled?: boolean },
): CallDerived {
  const { session } = state;
  const row = session?.id ? poll.rows.find((r) => r.id === session.id) : undefined;
  const phase = session ? callPhase(session, row) : null;
  const unanswered = outboundWaiting(session, phase);
  return {
    row,
    phase,
    gone: endedOnServer({ session, rows: poll.rows, pollStartedAt: poll.startedAt, idAt: state.idAt }),
    // Counted from when the server knows the call (its id), not from the tap: the mic prompt may take a while.
    deadline: unanswered && session?.id ? state.idAt + UNANSWERED_MS : null,
    incoming: session ? undefined : ringingFor(poll.rows, state.dismissed)[0],
    answer: row?.direction === 'outbound' ? row.answer_sdp : null,
    off: liveWhileOff(session, poll.enabled),
  };
}
