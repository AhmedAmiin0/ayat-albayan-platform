import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

/** Fades from 0 to 1 over 200ms once mounted; no movement, so it also runs under Reduce Motion. */
export function useFadeOpacity(): Animated.Value {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);
  return opacity;
}
