import { type RefObject, useEffect, useEffectEvent } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useChatSearch } from './search-context';

/**
 * The message list's side of «بحث»: each shown hit is jumped to (useJump: older pages load until
 * it is there, then it is centred and lit), and a close goes back to the newest message.
 */
export function useSearchJump<T>(
  list: RefObject<FlatList<T> | null>,
  jumps: { jump: (id: string, notFound?: string) => void; cancel: () => void },
): void {
  const search = useChatSearch();
  const shown = search?.hits[search.state.index]?.id;
  const closed = search?.closed ?? 0;
  const go = useEffectEvent((id: string) => jumps.jump(id, t.inbox.chatSearch.unreachable));
  const toNewest = useEffectEvent(() => {
    jumps.cancel();
    list.current?.scrollToOffset({ offset: 0, animated: true });
  });
  useEffect(() => {
    if (shown) go(shown);
  }, [shown]);
  useEffect(() => {
    if (closed > 0) toNewest();
  }, [closed]);
}
