import { sessionWindowOpen } from '../wa.js';

// replyNumber() (docs/23 §3 phase 5): replyLine() per number. Module mode only; legacy keeps replyLine().

/** The newest inbound of one phone on one number (v_thread_numbers, plus the legacy line windows mapped to their role's default). */
export interface NumberWindow {
  numberId: string;
  lastInboundAt: string | null;
}

export interface ReplyNumberInput {
  windows: readonly NumberWindow[];
  /** The number is enabled and can send now. */
  canSend: (numberId: string) => boolean;
  now: Date;
}

/** A time for ordering: missing or unreadable sorts oldest. */
const at = (s: string | null): number => {
  const t = s ? Date.parse(s) : Number.NaN;
  return Number.isNaN(t) ? -Infinity : t;
};

export type ReplyNumber = { numberId: string } | { code: 'session_closed' | 'number_not_configured' };

/**
 * The number a staff session text leaves from: the number the family wrote to most recently whose 24 h
 * window is open and that can send; open windows only on numbers that cannot send → number_not_configured
 * (503, like line_not_configured); no open window → session_closed (409).
 */
export function replyNumber(input: ReplyNumberInput): ReplyNumber {
  const open = input.windows
    .filter((w) => sessionWindowOpen(w.lastInboundAt, input.now))
    .sort((a, b) => at(b.lastInboundAt) - at(a.lastInboundAt) || a.numberId.localeCompare(b.numberId));
  const pick = open.find((w) => input.canSend(w.numberId));
  if (pick) return { numberId: pick.numberId };
  return { code: open.length > 0 ? 'number_not_configured' : 'session_closed' };
}

/** Merge windows: one entry per number, the newest time wins. */
export function mergeWindows(...lists: readonly (readonly NumberWindow[])[]): NumberWindow[] {
  const best = new Map<string, NumberWindow>();
  for (const w of lists.flat()) {
    const prev = best.get(w.numberId);
    if (!prev || at(w.lastInboundAt) > at(prev.lastInboundAt)) best.set(w.numberId, w);
  }
  return [...best.values()];
}
