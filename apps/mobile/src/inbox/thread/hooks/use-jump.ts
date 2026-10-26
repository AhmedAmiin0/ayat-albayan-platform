import type { MessageView } from '@ab/shared';
import { type RefObject, useEffect, useEffectEvent, useReducer, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useChatActions } from './chat-actions';
import { threadMessages } from './thread-cache';
import type { useThread } from './use-thread';

/** How long the original stays lit after a jump to it (ms). */
export const LIT_MS = 1600;
/** How many older pages a jump loads looking for the original before it gives up. */
export const JUMP_PAGES = 10;

interface IndexFailed {
  index: number;
  averageItemLength: number;
}

/** The thread query's older pages: whether there are more, and how to load the next one. */
type OlderPages = Pick<ReturnType<typeof useThread>, 'hasNextPage' | 'fetchNextPage'>;

/**
 * A tap on a quote (owner 2026-10-25): the inverted list scrolls to the original (centred) and lights it
 * up a moment. A row not laid out yet: jump near it by the average row height, then once more exactly.
 * Older than the loaded pages: older pages load (as the top of the list does) until it is there,
 * then the list goes to it once it renders; no more pages, or JUMP_PAGES without it: the chat says so;
 * a page that fails stops the search with the load error.
 */
export function useJump(list: RefObject<FlatList<MessageView> | null>, rows: readonly MessageView[], older: OlderPages) {
  const { say } = useChatActions();
  const [lit, setLit] = useState<string | null>(null);
  // The original found on an older page: gone to once that page renders (a render is forced).
  const pending = useRef<string | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retried = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const missing = () => say({ text: t.inbox.reply.notFound });

  const go = (index: number, id: string) => {
    retried.current = false;
    list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setLit(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLit(null), LIT_MS);
  };
  const reach = useEffectEvent(() => {
    const id = pending.current;
    const index = id ? rows.findIndex((r) => r.id === id) : -1;
    if (!id || index < 0) return;
    pending.current = null;
    go(index, id);
  });
  useEffect(() => reach(), [rows]);

  const seek = async (id: string) => {
    for (let n = 0; n < JUMP_PAGES; n += 1) {
      // Shares a page already loading (the top of the list) instead of cancelling it.
      const page = await older.fetchNextPage({ cancelRefetch: false });
      // A page that failed (fetchNextPage does not throw): stop, it is not «not found».
      if (page.isFetchNextPageError) return say({ text: t.common.error });
      if (threadMessages(page.data).some((m) => m.id === id)) {
        pending.current = id;
        return rerender();
      }
      if (!page.hasNextPage) break;
    }
    missing();
  };

  const jump = (id: string) => {
    const index = rows.findIndex((r) => r.id === id);
    if (index >= 0) return go(index, id);
    if (!older.hasNextPage) return missing();
    void seek(id).catch(missing);
  };

  const onScrollToIndexFailed = ({ index, averageItemLength }: IndexFailed) => {
    list.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
    if (retried.current) return;
    retried.current = true;
    setTimeout(
      () => list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }),
      120,
    );
  };

  return { lit, jump, onScrollToIndexFailed };
}
