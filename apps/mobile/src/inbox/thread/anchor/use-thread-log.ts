import { jumpPlan, windowEnd, type JumpPlan } from '@ab/client-core';
import { useState } from 'react';
import { threadMessages } from '@/inbox/thread/hooks/thread-cache';
import type { useThread } from '@/inbox/thread/hooks/use-thread';
import { useAnchorParam } from './use-anchor-param';
import { useAnchoredThread } from './use-anchored-thread';
import { useLeaveOnSend } from './use-leave-on-send';

type ThreadQuery = ReturnType<typeof useThread>;

interface Decision {
  msg: string;
  plan: JumpPlan;
}

/** The message to jump to once its rows are on screen. */
export interface LogTarget {
  id: string;
  /** Its rows are loaded (the live chat's, or the anchored window's). */
  ready: boolean;
}

interface ThreadLog {
  /** The rows the list shows: the live chat, or the window around the hit. */
  query: ThreadQuery;
  anchored: boolean;
  target: LogTarget | null;
  /** The window's newest time: calls after it stay out of the window (null = live). */
  to: string | null;
}

/**
 * Decides ONCE per `msg` (after the live first page loaded): a hit already loaded scrolls, any
 * other opens the window around it. A later poll never flips the decision.
 */
function useDecision(msg: string | undefined, live: ThreadQuery): JumpPlan | null {
  const [decided, setDecided] = useState<Decision | null>(null);
  // Back on the live chat: the next tap on the same hit decides again (it may now be loaded).
  if (msg === undefined && decided !== null) setDecided(null);
  if (isDue(msg, live, decided)) setDecided({ msg, plan: jumpPlan(msg, shownIds(live)) });
  return decided !== null && decided.msg === msg ? decided.plan : null;
}

/** A new `msg` and the live first page is in: time to decide. */
const isDue = (
  msg: string | undefined,
  live: ThreadQuery,
  decided: Decision | null,
): msg is string => msg !== undefined && live.data !== undefined && decided?.msg !== msg;

const shownIds = (live: ThreadQuery): string[] => threadMessages(live.data).map((m) => m.id);

/**
 * The chat's log (docs/37): the route's `?msg=` opens it at that message. The live query stays
 * mounted either way; while anchored the list, its older pages and its jumps run on the window.
 */
export function useThreadLog(phone: string, live: ThreadQuery): ThreadLog {
  const msg = useAnchorParam();
  const plan = useDecision(msg, live);
  const anchoredId = plan === 'anchor' ? msg : undefined;
  const around = useAnchoredThread(phone, anchoredId);
  useLeaveOnSend(phone, anchoredId !== undefined);
  // The live chat stays on screen until the window's rows are in (no empty flash meanwhile);
  // between two windows the previous one stays (a placeholder: anchored, the hit not ready).
  const anchored = anchoredId !== undefined && around.data !== undefined;
  const loaded = anchored && !around.isPlaceholderData;
  return {
    query: anchored ? around : live,
    anchored,
    target: targetOf(msg, { plan, anchored: loaded }),
    to: anchored ? windowEnd(threadMessages(around.data)) : null,
  };
}

/** The hit to jump to: ready once its rows show (the live chat's, or the window's). */
function targetOf(msg: string | undefined, at: { plan: JumpPlan | null; anchored: boolean }) {
  const ready = at.plan === 'scroll' || at.anchored;
  return msg !== undefined && at.plan !== null ? { id: msg, ready } : null;
}
