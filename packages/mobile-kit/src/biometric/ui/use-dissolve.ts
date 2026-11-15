import { useState } from 'react';
import { Animated } from 'react-native';
import { motion } from '../../theme';
import { useA11yPref } from '../../ui/primitives/use-a11y-pref';

// Critically damped (damping = 2√(stiffness·mass)): it settles as fast as it can, no bounce.
const STIFFNESS = 260;
const SPRING = { stiffness: STIFFNESS, damping: 2 * Math.sqrt(STIFFNESS), mass: 1 };
const GROW = 1.06;

/**
 * The lock dissolving into the app: it grows a little as it clears (scale + opacity on one
 * spring). Reduce Motion: a plain cross-fade.
 */
export function useDissolve() {
  const still = useA11yPref('reduceMotion');
  const [progress] = useState(() => new Animated.Value(0));
  const run = (done: () => void) => {
    const to = { toValue: 1, useNativeDriver: true };
    const anim = still
      ? Animated.timing(progress, { ...to, duration: motion.base })
      : Animated.spring(progress, { ...to, ...SPRING, overshootClamping: true });
    anim.start(() => done());
  };
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, still ? 1 : GROW] });
  return { style: { opacity, transform: [{ scale }] }, run };
}
