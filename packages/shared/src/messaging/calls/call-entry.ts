import type { CallView } from './call-types.js';

// A call as an entry in the chat and the calls log (WhatsApp-like, docs/28 §5): «مكالمة صوتية صادرة · 2:14»,
// «مكالمة واردة», «مكالمة فائتة» (danger), «لم يُرَدّ»; the clients map the kind to their strings and glyphs.

/** live = still ringing or talking; the rest are ended calls. */
export type CallEntryKind = 'outgoing' | 'incoming' | 'missed' | 'unanswered' | 'live';

export function callEntryKind(call: Pick<CallView, 'direction' | 'status' | 'end_reason'>): CallEntryKind {
  if (call.status !== 'ended') return 'live';
  if (call.end_reason === 'completed') return call.direction === 'outbound' ? 'outgoing' : 'incoming';
  return call.direction === 'inbound' ? 'missed' : 'unanswered';
}

/** A missed call is the one shown in the danger tone (red), like WhatsApp. */
export const isMissedCall = (kind: CallEntryKind): boolean => kind === 'missed';

/** Talk time as WhatsApp prints it: «0:07», «2:14», «1:02:03». Western digits, always LTR. */
export function formatCallDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

/** One row of the chat log: a message or a call, at its own time. */
export type ChatEntry<M, C> = { kind: 'message'; at: string; message: M } | { kind: 'call'; at: string; call: C };

export interface MergeOptions {
  /** Calls before this time are left out (the log's older pages are not loaded yet). */
  from?: string | null;
}

/**
 * Messages and calls in one list, oldest → newest by their own time (a message's created_at, a call's
 * started_at); a tie keeps the message first. Both inputs may come in any order.
 */
export function mergeChat<M extends { created_at: string }, C extends { started_at: string }>(
  messages: readonly M[],
  calls: readonly C[],
  opts: MergeOptions = {},
): ChatEntry<M, C>[] {
  const from = opts.from ? Date.parse(opts.from) : Number.NEGATIVE_INFINITY;
  const entries: ChatEntry<M, C>[] = [
    ...messages.map((message) => ({ kind: 'message' as const, at: message.created_at, message })),
    ...calls.filter((c) => Date.parse(c.started_at) >= from).map((call) => ({ kind: 'call' as const, at: call.started_at, call })),
  ];
  const order = (e: ChatEntry<M, C>) => (e.kind === 'message' ? 0 : 1);
  return entries
    .map((e, i) => ({ e, i, t: Date.parse(e.at) }))
    .sort((a, b) => a.t - b.t || order(a.e) - order(b.e) || a.i - b.i)
    .map((x) => x.e);
}
