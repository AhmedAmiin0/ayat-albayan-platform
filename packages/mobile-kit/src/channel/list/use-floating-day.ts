import { useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, type ViewToken } from 'react-native';
import { topDay } from './day-cover';
import type { ChannelRow } from '@ab/client-core';
import { useDayCover } from './use-day-cover';

/** How long the floating chip stays after the scroll stops. */
const LINGER_MS = 1200;

/**
 * The day of the topmost row while she scrolls (WhatsApp's floating chip): shown when a drag
 * starts, faded a moment after the scroll stops; hidden while an inline day chip takes its place
 * (useDayCover), so two chips never show.
 */
export function useFloatingDay() {
  const cover = useDayCover();
  const [label, setLabel] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { band } = cover;
  const [onViewable] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ChannelRow>[] }) => {
        band.viewable(viewableItems);
        setLabel(topDay(viewableItems));
      },
  );
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(() => stop, []);
  const show = () => {
    stop();
    opacity.setValue(1);
  };
  const fade = () => {
    stop();
    timer.current = setTimeout(
      () => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(),
      LINGER_MS,
    );
  };
  return {
    label: cover.covered ? null : label,
    opacity,
    onViewable,
    frame: band.frame,
    onChip: band.chip,
    scroll: {
      onScrollBeginDrag: show,
      onScrollEndDrag: fade,
      onMomentumScrollEnd: fade,
      onScroll: band.scroll,
      scrollEventThrottle: 16,
      onLayout: (e: LayoutChangeEvent) => band.layout(e.nativeEvent.layout),
    },
  };
}
