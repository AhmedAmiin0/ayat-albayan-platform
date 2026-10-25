import type { MessageView } from '@ab/shared';
import { type RefObject, useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useChatActions } from './chat-actions';

/** How long the original stays lit after a jump to it (ms). */
export const LIT_MS = 1600;

interface IndexFailed {
  index: number;
  averageItemLength: number;
}

/**
 * A tap on a quote (owner 2026-10-25): the inverted list scrolls to the original (centred) and lights it
 * up a moment. A row not laid out yet: jump near it by the average row height, then once more exactly.
 * Older than the loaded pages: the chat says so (inbox.reply.notLoaded) instead of loading pages blindly.
 */
export function useJump(
  list: RefObject<FlatList<MessageView> | null>,
  rows: readonly MessageView[],
) {
  const { say } = useChatActions();
  const [lit, setLit] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retried = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const jump = (id: string) => {
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) return say({ text: t.inbox.reply.notLoaded });
    retried.current = false;
    list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    setLit(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLit(null), LIT_MS);
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
