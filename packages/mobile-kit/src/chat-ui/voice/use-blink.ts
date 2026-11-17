import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';

/** A 1 s blink (1 → 0.2 → 1) while mounted; still with «Reduce Motion». */
export function useBlink(): Animated.Value {
  const still = useA11yPref('reduceMotion');
  const [blink] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, blink]);
  return blink;
}
