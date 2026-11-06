import type { ThreadDetail } from '@ab/shared';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { anchoredThreadQuery, hitGone } from '@/features/messaging/inbox/api/anchored';
import { useLastOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';
import type { LogAnchor } from '@/features/messaging/inbox/messages/lib/use-anchor-scroll';
import { useChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { decideView, LIVE_VIEW, pageRows, type AnchorView } from './anchor-view';

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

/** Only from one window to the next: the old one stays on screen while the next loads. */
const keepWindow = <T,>(prev: T | undefined, prevQuery?: { queryKey: readonly unknown[] }) =>
  prevQuery?.queryKey[2] ? prev : undefined;

/** The window's problem in the log's status line: gone (404) or a failed read. */
const problemOf = (error: Error | null): string | null =>
  error && (hitGone(error) ? t.inbox.chatSearch.unreachable : t.common.error);

/**
 * The window around `id` (null: none): shown once it answered, the previous window kept while
 * the next loads (never a flash of the live chat between two windows).
 */
function useWindow(phone: string, id: string | null) {
  const at = useInfiniteQuery({
    ...anchoredThreadQuery(phone, id ?? ''),
    enabled: id !== null,
    placeholderData: keepWindow,
  });
  const open = id !== null;
  const waiting = open && (at.isPending || at.isPlaceholderData);
  const problem = open ? problemOf(at.error) : null;
  return { at, shown: open && at.data !== undefined, waiting, problem };
}

/** The window's problem shows only while its hit is the one asked for (a later scroll hides it). */
const problemFor = (view: AnchorView, problem: string | null): string | null =>
  view.msg === view.window ? problem : null;

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
    /** The log's status line for the window: the hit is gone (404) or the read failed. */
    problem: problemFor(view, w.problem),
  };
}
