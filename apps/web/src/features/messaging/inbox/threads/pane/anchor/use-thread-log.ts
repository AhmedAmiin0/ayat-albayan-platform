import type { ThreadDetail } from '@ab/shared';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { anchoredThreadQuery } from '@/features/messaging/inbox/api/anchored';
import { useLastOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import type { LogAnchor } from '@/features/messaging/inbox/messages/lib/use-anchor-scroll';
import { useChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { decideView, LIVE_VIEW, pageRows } from './anchor-view';

/** A chat query (the live useLiveThread or the window): what the log reads of it. */
interface Pages {
  data: InfiniteData<ThreadDetail> | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

/** A hit already on screen: scrolled to and flashed after the paint (the keyboard stays). */
function useScrollTo(id: string | null): void {
  useEffect(() => {
    if (id) jumpToMessage(id, false);
  }, [id]);
}

/** Her own send in this chat (a new id from the composer) leaves the anchor. */
function useLeaveOnSend(phone: string, leave: (() => void) | null): void {
  const mine = useLastOwnSend(phone);
  const seen = useRef(mine);
  const go = useEffectEvent(() => leave?.());
  useEffect(() => {
    const sent = mine !== seen.current;
    seen.current = mine;
    if (sent) go();
  }, [mine]);
}

/** The window around `id` (null: none): asked once, shown once it answered, lost on a 404. */
function useWindow(phone: string, id: string | null) {
  const at = useInfiniteQuery({ ...anchoredThreadQuery(phone, id ?? ''), enabled: id !== null });
  const open = id !== null;
  const shown = open && at.data !== undefined;
  return { at, shown, waiting: open && at.isPending, lost: open && at.isError };
}

/** The log's anchor while the window shows: its hit and the way back to the live chat. */
const logAnchor = (id: string | null, onNewest: () => void): LogAnchor | undefined =>
  id === null ? undefined : { id, onNewest };

/** A new `msg` is decided on what is on screen: the live first page, and the window once loaded. */
const isReady = (live: Pages, window: { waiting: boolean }): boolean =>
  live.data !== undefined && !window.waiting;

/**
 * The open chat's log (docs/37 NEW 3): the live pages, or the window around a search hit. The
 * URL's `msg` is decided once per value after the live first page loads (client-core jumpPlan):
 * a hit on screen scrolls, any other opens the window with one request (?around=). Older pages
 * page inside the window; «الانتقال إلى أحدث رسالة», closing the search and her own send go
 * back to the live chat. The live query stays mounted (header, composer, read stamp, poll).
 */
export function useThreadLog(phone: string, live: Pages) {
  const { msg, anchor } = useChatAnchor();
  const [view, setView] = useState(LIVE_VIEW);
  const w = useWindow(phone, view.window);
  const source: Pages = w.shown ? w.at : live;
  const messages = pageRows(source.data);
  if (msg !== view.msg && isReady(live, w)) setView(decideView(view, { msg, shown: messages }));
  useScrollTo(view.scroll);
  const leave = () => anchor(undefined);
  useLeaveOnSend(phone, msg === undefined ? null : leave);
  return {
    messages,
    hasMore: source.hasNextPage,
    loadingOlder: source.isFetchingNextPage,
    onOlder: () => void source.fetchNextPage(),
    anchor: logAnchor(w.shown ? view.window : null, leave),
    /** The hit is not in this chat any more (the window's read answered 404). */
    lost: w.lost,
  };
}
