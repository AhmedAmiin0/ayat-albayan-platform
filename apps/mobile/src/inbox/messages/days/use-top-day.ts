import { useEffect, useRef, useState } from 'react';
import { Animated, type ViewToken } from 'react-native';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { dayLabel } from './day-label';

/** How long the floating day stays after the scroll stops, and its fade (ms). */
export const TOP_DAY_HIDE_MS = 1200;
const FADE_MS = 200;

/** Any dated row (a message, or a call merged in). */
type Dated = { created_at: string };
type Viewable = { viewableItems: ViewToken<Dated>[] };

/**
 * The floating day chip (owner 2026-10-27, as WhatsApp): while she scrolls, the day of the topmost
 * message on screen (the highest index of the inverted list); it fades out a moment after the scroll
 * stops. With Reduce Motion it only shows and hides. `label` is null while hidden.
 */
export function useTopDay() {
  const still = useA11yPref('reduceMotion');
  const [label, setLabel] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // FlatList refuses a new onViewableItemsChanged after mount: one stable function.
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: Viewable) => {
    let top: ViewToken<Dated> | null = null;
    for (const v of viewableItems) if ((v.index ?? -1) > (top?.index ?? -1)) top = v;
    if (top) setLabel(dayLabel(top.item.created_at));
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
    label: shown ? label : null,
    opacity,
    list: {
      onViewableItemsChanged,
      onScrollBeginDrag: show,
      onMomentumScrollBegin: show,
      onScrollEndDrag: settle,
      onMomentumScrollEnd: settle,
    },
  };
}
