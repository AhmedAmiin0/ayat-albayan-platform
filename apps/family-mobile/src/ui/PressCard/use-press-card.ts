import { useState } from 'react';
import { Animated } from 'react-native';
import { criticalSpring, pressScale, useA11yPref } from '@ab/mobile-kit';

/** Quick enough to follow the finger, critically damped so the release never bounces. */
const PRESS_SPRING = criticalSpring(250);
export function usePressCard() {
  const still = useA11yPref('reduceMotion');
  const [scale] = useState(() => new Animated.Value(1));
  const press = (down: boolean) => () =>
    Animated.spring(scale, {
      toValue: pressScale(down, still),
      ...PRESS_SPRING,
      useNativeDriver: true,
    }).start();
  return { scale, press };
}
