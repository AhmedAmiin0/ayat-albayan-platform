import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

export interface CycleOptions {
  /** One turn, ms: the value runs 0 → 1 linearly, then starts again at 0. */
  duration: number;
  /** Once, before the first turn: staggered dots in a row keep one period. */
  delay?: number;
  /** Reduce Motion: the value rests at 0, no loop runs. */
  still: boolean;
}

/** A linear 0 → 1 loop on the native driver, for a turning ring and a wave of dots. */
export function useCycle({ duration, delay = 0, still }: CycleOptions): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    value.setValue(0);
    if (still) return undefined;
    const turn = Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true });
    const loop = Animated.loop(turn);
    const run = delay > 0 ? Animated.sequence([Animated.delay(delay), loop]) : loop;
    run.start();
    return () => run.stop();
  }, [value, duration, delay, still]);
  return value;
}
