import { canGrantShare, type JoinRole } from '@ab/shared';

/** «اطلب مشاركة الشاشة» / «اطلب الكتابة على السبورة» / «اطلب فتح السبورة» on the data channel (reliable). */
export const SHARE_TOPIC = 'share-request';

/** What a guest asks the staff for. */
export const REQUEST_KINDS = ['screen', 'draw', 'open'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

/** A guest asks; a staff member's «رفض» names the guest (everyone hears it, so other staff clear it too). */
export type ShareMessage = { t: 'request'; what: RequestKind } | { t: 'deny'; who: string; what: RequestKind };

export function encodeShare(msg: ShareMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

/** Absent (an older client, screen requests only) reads as 'screen'; anything unknown is junk. */
const kindOf = (v: unknown): RequestKind | null => (v === undefined ? 'screen' : (REQUEST_KINDS.find((k) => k === v) ?? null));

export function decodeShare(bytes: Uint8Array): ShareMessage | null {
  try {
    const v = JSON.parse(new TextDecoder().decode(bytes)) as Partial<{ t: unknown; who: unknown; what: unknown }>;
    const what = kindOf(v.what);
    if (what === null) return null;
    if (v.t === 'request') return { t: 'request', what };
    if (v.t === 'deny' && typeof v.who === 'string') return { t: 'deny', who: v.who, what };
    return null;
  } catch {
    return null;
  }
}

export type MineState = 'idle' | 'pending' | 'denied';

export interface PendingRequest {
  identity: string;
  what: RequestKind;
}

export interface ShareState {
  /** Guests waiting for «سماح» / «رفض», oldest first (staff side). */
  pending: PendingRequest[];
  /** My own requests, per kind (guest side). */
  mine: Record<RequestKind, MineState>;
}

export const EMPTY_SHARE: ShareState = { pending: [], mine: { screen: 'idle', draw: 'idle', open: 'idle' } };

export type ShareInput =
  | { kind: 'message'; msg: ShareMessage; from: { identity: string; role: JoinRole | null }; me: string }
  | { kind: 'asked'; what: RequestKind }
  | { kind: 'granted'; what: RequestKind }
  /** The guest closed the «رُفض…» line. */
  | { kind: 'dismissed' }
  | { kind: 'settled'; identity: string; what: RequestKind };

const same = (a: PendingRequest, b: PendingRequest): boolean => a.identity === b.identity && a.what === b.what;
const setMine = (state: ShareState, what: RequestKind, to: MineState): ShareState =>
  state.mine[what] === to ? state : { ...state, mine: { ...state.mine, [what]: to } };

function dismissed(state: ShareState): ShareState {
  const mine = { ...state.mine };
  for (const k of REQUEST_KINDS) if (mine[k] === 'denied') mine[k] = 'idle';
  return REQUEST_KINDS.some((k) => state.mine[k] === 'denied') ? { ...state, mine } : state;
}

/**
 * Requests per session, nothing stored. Only a guest's request counts (a duplicate while pending is
 * ignored); only a staff sender's «رفض» counts (the role comes from the signed token metadata).
 */
export function shareReducer(state: ShareState, input: ShareInput): ShareState {
  if (input.kind === 'asked') return state.mine[input.what] === 'pending' ? state : setMine(state, input.what, 'pending');
  if (input.kind === 'granted') return setMine(state, input.what, 'idle');
  if (input.kind === 'dismissed') return dismissed(state);
  if (input.kind === 'settled') return { ...state, pending: state.pending.filter((p) => !same(p, input)) };
  return onMessage(state, input);
}

function onMessage(state: ShareState, { msg, from, me }: Extract<ShareInput, { kind: 'message' }>): ShareState {
  if (msg.t === 'request') {
    const req = { identity: from.identity, what: msg.what };
    if (from.role !== 'guest' || state.pending.some((p) => same(p, req))) return state;
    return { ...state, pending: [...state.pending, req] };
  }
  if (!canGrantShare(from.role, 'guest')) return state;
  const pending = state.pending.filter((p) => !same(p, { identity: msg.who, what: msg.what }));
  const denied = msg.who === me && state.mine[msg.what] === 'pending';
  return { ...(denied ? setMine(state, msg.what, 'denied') : state), pending };
}
