import { useState } from 'react';
import { Animated, PanResponder, type PanResponderGestureState } from 'react-native';

/** Far or fast enough down to close: past 64pt, or a flick faster than 0.6pt/ms. */
export const swipeCloses = (g: Pick<PanResponderGestureState, 'dy' | 'vy'>): boolean =>
  g.dy > 64 || g.vy > 0.6;

/** A drag that is mostly downward (taps and sideways moves stay the tiles'). */
const downward = (g: PanResponderGestureState): boolean => g.dy > 8 && g.dy > Math.abs(g.dx);

/**
 * A bottom sheet that follows the finger down and closes on a long or fast swipe, else springs back
 * (React Native's own PanResponder: no native module, OTA-safe). `reset` puts it back for the next
 * open (the Modal's onShow).
 */
export function useSwipeClose(onClose: () => void) {
  const [y] = useState(() => new Animated.Value(0));
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => downward(g),
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) =>
      swipeCloses(g)
        ? onClose()
        : Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
  });
  return { handlers: pan.panHandlers, translateY: y, reset: () => y.setValue(0) };
}
