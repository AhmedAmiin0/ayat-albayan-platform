import type { MessageView } from '@ab/shared';
import { useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, type ViewToken } from 'react-native';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { DayCell } from './DayCell';
import { useDayBand } from './use-day-band';

/** How long the floating day stays after the scroll stops, and its fade (ms). */
export const TOP_DAY_HIDE_MS = 1200;
const FADE_MS = 200;

type Viewable = { viewableItems: ViewToken<MessageView>[] };

/**
 * The floating day chip (owner 2026-10-27, as WhatsApp): while she scrolls, the day of the topmost
 * message on screen (the highest index of the inverted list); it fades out a moment after the scroll
 * stops. With Reduce Motion it only shows and hides. Never over an inline separator (useDayBand): it
 * hides while one is in its band, and comes back with the new day once it has scrolled past; never
 * beside the inline chip of its own day. `label` is null while hidden. `more`: an older page exists.
 */
export function useTopDay(rows: readonly MessageView[], more: boolean) {
  const still = useA11yPref('reduceMotion');
  const band = useDayBand(rows, more);
  const [label, setLabel] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // FlatList refuses a new onViewableItemsChanged after mount: one stable function.
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: Viewable) => {
    const top = band.viewable(viewableItems);
    if (top) setLabel(top);
  });

  const fade = (toValue: number, done?: () => void) => {
    if (still) {
      opacity.setValue(toValue);
      return done?.();
    }
    Animated.timing(opacity, { toValue, duration: FADE_MS, useNativeDriver: true }).start(() => done?.());
  };
  const show = () => {
    clearTimeout(timer.current);
    setShown(true);
    fade(1);
  };
  const settle = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fade(0, () => setShown(false)), TOP_DAY_HIDE_MS);
  };
  return {
    label: shown && !band.covered ? label : null,
    opacity,
    onChip: band.chip,
    frame: band.frame,
    list: {
      CellRendererComponent: DayCell,
      onScroll: band.scroll,
      onLayout: (e: LayoutChangeEvent) => band.layout(e.nativeEvent.layout),
      scrollEventThrottle: 16,
      onViewableItemsChanged,
      onScrollBeginDrag: show,
      onMomentumScrollBegin: show,
      onScrollEndDrag: settle,
      onMomentumScrollEnd: settle,
    },
  };
}
