import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

interface PulseOptions {
  /** One way, ms: the value goes 0 → 1 → 0 in twice this. */
  duration: number;
  /** Wait before rising and after falling, so staggered pulses keep one period (dots in a row). */
  lead?: number;
  trail?: number;
  /** Reduce Motion (or nothing to animate): the value rests at 0 (the loop's first frame), no loop runs. */
  still: boolean;
}

/** A gentle 0 → 1 → 0 loop on the native driver, for breathing marks and pulsing dots. */
export function usePulse({ duration, lead = 0, trail = 0, still }: PulseOptions): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      value.setValue(0);
      return undefined;
    }
    const ease = Easing.inOut(Easing.sin);
    const step = (toValue: number) => Animated.timing(value, { toValue, duration, easing: ease, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([Animated.delay(lead), step(1), step(0), Animated.delay(trail)]));
    loop.start();
    return () => loop.stop();
  }, [value, duration, lead, trail, still]);
  return value;
}
