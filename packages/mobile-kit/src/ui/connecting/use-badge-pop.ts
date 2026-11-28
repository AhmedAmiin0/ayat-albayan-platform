import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * The design's dash travel (24 → 0), mapped onto the tick's real length so it draws over the full
 * 360 ms.
 */
const TRAVEL = 24;
export const TICK_LENGTH = 11.4;
const POP_MS = 320;
const DRAW_MS = 360;
const DRAW_DELAY_MS = 120;

function badgeAnimation(scale: Animated.Value, dash: Animated.Value) {
  const pop = (toValue: number, duration: number) =>
    Animated.timing(scale, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
  const draw = Animated.timing(dash, {
    toValue: 0,
    duration: DRAW_MS,
    delay: DRAW_DELAY_MS,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  });
  return Animated.parallel([
    Animated.sequence([pop(1.12, POP_MS * 0.6), pop(1, POP_MS * 0.4)]),
    draw,
  ]);
}

/** The pop runs on the native driver, the SVG dash cannot; Reduce Motion shows it finished. */
export function useBadgePop(still: boolean) {
  const [scale] = useState(() => new Animated.Value(still ? 1 : 0.6));
  const [dash] = useState(() => new Animated.Value(still ? 0 : TRAVEL));
  useEffect(() => {
    if (still) {
      scale.setValue(1);
      dash.setValue(0);
      return undefined;
    }
    const run = badgeAnimation(scale, dash);
    run.start();
    return () => run.stop();
  }, [still, scale, dash]);
  const offset = dash.interpolate({ inputRange: [0, TRAVEL], outputRange: [0, TICK_LENGTH] });
  return { scale, offset };
}
