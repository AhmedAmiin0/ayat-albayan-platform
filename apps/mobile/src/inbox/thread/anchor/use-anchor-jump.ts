import { type RefObject, useEffect, useEffectEvent, useRef } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import type { LogTarget } from './use-thread-log';

interface AnchorJump {
  target: LogTarget | null;
  anchored: boolean;
  /** useJump's jump: centres and lights the row. */
  jump: (id: string, notFound?: string) => void;
}

/**
 * The list's side of the anchor: the hit is centred and lit once its rows render (the live
 * chat's, or the window's: about row 20 of the inverted list), once per hit; leaving the window
 * (BackToNewest, a send, the search closed, a gone hit) returns to the newest message, unless the
 * step lands on a hit the live chat shows (that jump wins).
 */
export function useAnchorJump<T>(list: RefObject<FlatList<T> | null>, input: AnchorJump): void {
  const { target, anchored } = input;
  const id = target?.ready ? target.id : undefined;
  const go = useEffectEvent((hit: string) => input.jump(hit, t.inbox.chatSearch.unreachable));
  useEffect(() => {
    if (id) go(id);
  }, [id]);
  const was = useRef(anchored);
  // Leaving to a hit shown in the live chat jumps to it (effect above): no scroll home over it.
  const toNewest = useEffectEvent(() => {
    if (input.target?.ready) return;
    list.current?.scrollToOffset({ offset: 0, animated: false });
  });
  useEffect(() => {
    if (was.current && !anchored) toNewest();
    was.current = anchored;
  }, [anchored]);
}
