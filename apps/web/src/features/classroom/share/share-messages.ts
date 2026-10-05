import { canGrantShare, type JoinRole } from '@ab/shared';

/** «اطلب مشاركة الشاشة» on the data channel (reliable, its own topic next to the board's). */
export const SHARE_TOPIC = 'share-request';

/** A guest asks; a staff member's «رفض» names the guest (everyone hears it, so other staff clear it too). */
export type ShareMessage = { t: 'request' } | { t: 'deny'; who: string };

export function encodeShare(msg: ShareMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

export function decodeShare(bytes: Uint8Array): ShareMessage | null {
  try {
    const v = JSON.parse(new TextDecoder().decode(bytes)) as Partial<{ t: unknown; who: unknown }>;
    if (v.t === 'request') return { t: 'request' };
    if (v.t === 'deny' && typeof v.who === 'string') return { t: 'deny', who: v.who };
    return null;
  } catch {
    return null;
  }
}

export interface ShareState {
  /** Guests waiting for «سماح» / «رفض», oldest first (staff side). */
  pending: string[];
  /** My own request (guest side). */
  mine: 'idle' | 'pending' | 'denied';
}

export const EMPTY_SHARE: ShareState = { pending: [], mine: 'idle' };

export type ShareInput =
  | { kind: 'message'; msg: ShareMessage; from: { identity: string; role: JoinRole | null }; me: string }
  | { kind: 'asked' }
  | { kind: 'granted' }
  /** The guest closed the «رُفض…» line. */
  | { kind: 'dismissed' }
  | { kind: 'settled'; identity: string };

const without = (list: string[], id: string): string[] => list.filter((x) => x !== id);

/**
 * Requests per session, nothing stored. Only a guest's request counts (a duplicate while pending is
 * ignored); only a staff sender's «رفض» counts (the role comes from the signed token metadata).
 */
export function shareReducer(state: ShareState, input: ShareInput): ShareState {
  if (input.kind === 'asked') return state.mine === 'pending' ? state : { ...state, mine: 'pending' };
  if (input.kind === 'granted') return { ...state, mine: 'idle' };
  if (input.kind === 'dismissed') return state.mine === 'denied' ? { ...state, mine: 'idle' } : state;
  if (input.kind === 'settled') return { ...state, pending: without(state.pending, input.identity) };
  return onMessage(state, input);
}

function onMessage(state: ShareState, { msg, from, me }: Extract<ShareInput, { kind: 'message' }>): ShareState {
  if (msg.t === 'request') {
    if (from.role !== 'guest' || state.pending.includes(from.identity)) return state;
    return { ...state, pending: [...state.pending, from.identity] };
  }
  if (!canGrantShare(from.role, 'guest')) return state;
  const mine = msg.who === me && state.mine === 'pending' ? 'denied' : state.mine;
  return { pending: without(state.pending, msg.who), mine };
}
