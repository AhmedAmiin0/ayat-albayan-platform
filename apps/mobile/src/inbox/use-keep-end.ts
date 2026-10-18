import { type RefObject, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How close to the bottom (pt) still counts as «at the end». */
export const NEAR_END = 48;

type Scrollable = { scrollToEnd: (o: { animated: boolean }) => void };

/**
 * Keeps the newest message in sight when the list SHRINKS (the keyboard opens) while it was at or
 * near the end. Scrolls after the new height is in (next frame), never with the pre-shrink metrics;
 * a list that grows or was scrolled up to older messages stays where it is.
 */
export function useKeepEnd(list: RefObject<Scrollable | null>) {
  const height = useRef<number | null>(null);
  const atEnd = useRef(true);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    const before = height.current;
    height.current = next;
    if (before === null || next >= before || !atEnd.current) return;
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated: false }));
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atEnd.current = contentSize.height - contentOffset.y - layoutMeasurement.height <= NEAR_END;
  };
  return { onLayout, onScroll };
}
