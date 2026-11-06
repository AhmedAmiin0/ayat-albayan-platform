import { jumpPlan, type JumpPlan } from '@ab/client-core';
import type { MessageView, ThreadDetail } from '@ab/shared';

/** What the open chat shows for its URL anchor (docs/37 NEW 3). */
export interface AnchorView {
  /** The `msg` this view was decided for (undefined = the live chat). */
  msg: string | undefined;
  /** The window shown instead of the live chat: the hit it opened around; null = live. */
  window: string | null;
  /** A hit already on screen to scroll to (in the live chat or inside the window). */
  scroll: string | null;
}

export const LIVE_VIEW: AnchorView = { msg: undefined, window: null, scroll: null };

const NEXT: Record<JumpPlan, (v: AnchorView, msg: string) => AnchorView> = {
  scroll: (v, msg) => ({ msg, window: v.window, scroll: msg }),
  anchor: (_, msg) => ({ msg, window: msg, scroll: null }),
};

/**
 * The view for a new `msg`, decided once per value: a hit among the rows on screen scrolls (the
 * window, if any, stays); any other opens the window around it; no `msg` is the live chat.
 */
export function decideView(
  v: AnchorView,
  next: { msg: string | undefined; shown: readonly Pick<MessageView, 'id'>[] },
): AnchorView {
  const { msg } = next;
  return msg === undefined ? LIVE_VIEW : NEXT[jumpPlan(msg, next.shown.map((m) => m.id))](v, msg);
}

/** A chat query's pages (newest page first) as one list, oldest → newest. */
export const pageRows = (data: { pages: readonly ThreadDetail[] } | undefined): MessageView[] =>
  [...(data?.pages ?? [])].reverse().flatMap((p) => p.messages);
