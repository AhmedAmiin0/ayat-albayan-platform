import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

const POP_MS = 320;
const DRAW_MS = 360;
const DRAW_DELAY_MS = 120;
const EASE = Easing.out(Easing.cubic);

/**
 * The pop runs on the native driver, the SVG dash (from `travel` to 0) cannot;
 * Reduce Motion shows it finished.
 */
export function useCheckPop(still: boolean, travel: number) {
  const [scale] = useState(() => new Animated.Value(still ? 1 : 0.6));
  const [dash] = useState(() => new Animated.Value(still ? 0 : travel));
  useEffect(() => {
    if (still) {
      scale.setValue(1);
      dash.setValue(0);
      return undefined;
    }
    const pop = (toValue: number, duration: number) =>
      Animated.timing(scale, { toValue, duration, easing: EASE, useNativeDriver: true });
    const draw = Animated.timing(dash, {
      toValue: 0,
      duration: DRAW_MS,
      delay: DRAW_DELAY_MS,
      easing: EASE,
      useNativeDriver: false,
    });
    const run = Animated.parallel([
      Animated.sequence([pop(1.12, POP_MS * 0.6), pop(1, POP_MS * 0.4)]),
      draw,
    ]);
    run.start();
    return () => run.stop();
  }, [still, scale, dash]);
  return { scale, dash };
}
