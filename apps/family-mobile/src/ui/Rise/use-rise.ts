import { useRef, useState } from 'react';
import { Animated } from 'react-native';
import { criticalSpring } from '@ab/mobile-kit';
import type { Arrive, RiseProps } from './Rise.types';

/** How far a card rises on its way in (dp). */
const RISE = 8;
/** Each card starts this long after the one above it; past a few cards the wait stops growing. */
const STAGGER_MS = 50;
const MAX_STAGGER = 6;
/** An arrival, not a reaction: a little softer than a press, still critically damped. */
const ARRIVE_SPRING = criticalSpring(400);

/** Reduce Motion: shown at once; else one spring for the fade and the rise together. */
const ARRIVE: Record<'still' | 'spring', Arrive> = {
  still: (shown) => shown.setValue(1),
  spring: (shown, delay) =>
    Animated.spring(shown, {
      toValue: 1,
      delay,
      ...ARRIVE_SPRING,
      useNativeDriver: true,
    }).start(),
};

export function useRise({ index, still }: Pick<RiseProps, 'index' | 'still'>) {
  const [shown] = useState(() => new Animated.Value(0));
  const startedRef = useRef(false);
  const start = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const delay = Math.min(Math.max(index, 0), MAX_STAGGER) * STAGGER_MS;
    ARRIVE[still ? 'still' : 'spring'](shown, delay);
  };
  const rise = shown.interpolate({ inputRange: [0, 1], outputRange: [still ? 0 : RISE, 0] });
  return { shown, start, rise };
}
