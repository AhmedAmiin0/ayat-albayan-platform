import { useState } from 'react';
import { Animated } from 'react-native';
import { motion } from '@ab/catalog';
import { useA11yPref } from '@ab/mobile-kit';

/** How far a panel slides in (pt). */
const RISE = 12;

/**
 * The child tabs' change (docs/50 §6: animated tab changes): the new panel fades and rises in,
 * started from the press itself (no effect); none under «Reduce Motion».
 */
export function useTabMotion() {
  const [shown] = useState(() => new Animated.Value(1));
  const still = useA11yPref('reduceMotion');
  const play = (): void => {
    if (still) return;
    shown.setValue(0);
    Animated.timing(shown, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
  };
  const style = {
    opacity: shown,
    transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }],
  };
  return { play, style };
}
