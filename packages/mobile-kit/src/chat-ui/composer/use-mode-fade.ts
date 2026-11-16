import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';

/**
 * The round button's icon crossfade: 120 ms whenever `mode` changes, never on the first render
 * nor with «Reduce Motion». Hands back the opacity and its scale (0.8 → 1).
 */
export function useModeFade(mode: string) {
  const still = useA11yPref('reduceMotion');
  const [fade] = useState(() => new Animated.Value(1));
  const shown = useRef(mode);
  useEffect(() => {
    if (shown.current === mode) return;
    shown.current = mode;
    if (still) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, [mode, still, fade]);
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  return { opacity: fade, transform: [{ scale }] };
}
