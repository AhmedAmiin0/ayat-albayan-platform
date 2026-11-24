import { useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import type { ChannelRow } from '@ab/client-core';

/** FlatList's answer when the row is not laid out yet: scroll near it instead. */
interface ScrollFailed {
  index: number;
  averageItemLength: number;
}

/** How long the quoted message keeps its brand edge after the jump. */
const LIT_MS = 1500;

/**
 * A tap on a quote goes to the original when it is loaded: the list scrolls it
 * to the middle and lights its edge a moment. Not loaded: nothing moves.
 */
export function useJump(rows: readonly ChannelRow[]) {
  const listRef = useRef<FlatList<ChannelRow>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const jump = (id: string) => {
    const index = rows.findIndex((r) => r.message.id === id);
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    setLit(id);
    timer.current = setTimeout(() => setLit(null), LIT_MS);
  };
  const onScrollToIndexFailed = (info: ScrollFailed) => {
    const offset = info.index * info.averageItemLength;
    listRef.current?.scrollToOffset({ offset, animated: true });
  };
  return { listRef, lit, jump, onScrollToIndexFailed };
}
