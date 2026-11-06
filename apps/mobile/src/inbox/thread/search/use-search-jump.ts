import { type RefObject, useEffect, useEffectEvent } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { anchorAt, leaveAnchor, useAnchorParam } from '@/inbox/thread/anchor';
import { useChatSearch } from './search-context';

interface SearchJumps<T> {
  jump: (id: string, notFound?: string) => void;
  cancel: () => void;
  /** The rows on screen (the live chat's, or the anchored window's). */
  rows: readonly T[];
}

/** A hit on screen is centred and lit; any other opens the window around it. */
const GO = new Map<boolean, (id: string, jumps: SearchJumps<{ id: string }>) => void>([
  [true, (id, jumps) => jumps.jump(id, t.inbox.chatSearch.unreachable)],
  [false, (id) => anchorAt(id)],
]);

/**
 * The message list's side of «بحث»: a shown hit already on screen is centred and lit (useJump);
 * any other opens the window around it with one request (`?msg=`, docs/37), never a page-by-page
 * seek. A close goes back to the live chat, at the newest message.
 */
export function useSearchJump<T extends { id: string }>(
  list: RefObject<FlatList<T> | null>,
  jumps: SearchJumps<T>,
): void {
  const search = useChatSearch();
  const shown = search?.hits[search.state.index]?.id;
  const closed = search?.closed ?? 0;
  const anchored = useAnchorParam() !== undefined;
  const go = useEffectEvent((id: string) => {
    const onScreen = jumps.rows.some((r) => r.id === id);
    GO.get(onScreen)?.(id, jumps);
  });
  const toNewest = useEffectEvent(() => {
    jumps.cancel();
    if (anchored) leaveAnchor();
    list.current?.scrollToOffset({ offset: 0, animated: true });
  });
  useEffect(() => {
    if (shown) go(shown);
  }, [shown]);
  useEffect(() => {
    if (closed > 0) toNewest();
  }, [closed]);
}
