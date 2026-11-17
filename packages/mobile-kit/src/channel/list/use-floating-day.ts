import { useEffect, useRef, useState } from 'react';
import { Animated, type ViewToken } from 'react-native';
import type { ChannelRow } from './list-rows';

/** How long the floating chip stays after the scroll stops. */
const LINGER_MS = 1200;

/**
 * The day of the topmost row while she scrolls (WhatsApp's floating chip): shown when a drag
 * starts, faded a moment after the scroll stops. The list is inverted: the last viewable row is the
 * top one.
 */
export function useFloatingDay() {
  const [label, setLabel] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onViewable] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<ChannelRow>[] }) =>
        setLabel(viewableItems.at(-1)?.item.dayText ?? null),
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
    label,
    opacity,
    onViewable,
    scroll: { onScrollBeginDrag: show, onScrollEndDrag: fade, onMomentumScrollEnd: fade },
  };
}
