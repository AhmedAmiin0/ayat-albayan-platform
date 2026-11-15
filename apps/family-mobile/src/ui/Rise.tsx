import { useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { criticalSpring } from '@ab/mobile-kit';

/** How far a card rises on its way in (dp). */
const RISE = 8;
/** Each card starts this long after the one above it; past a few cards the wait stops growing. */
const STAGGER_MS = 50;
const MAX_STAGGER = 6;
/** An arrival, not a reaction: a little softer than a press, still critically damped. */
const ARRIVE_SPRING = criticalSpring(400);

type Arrive = (shown: Animated.Value, delay: number) => void;

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

interface RiseProps {
  /** Its place in the list: later cards start a little after. */
  index: number;
  /** Reduce Motion (read once by the screen). */
  still: boolean;
  children: ReactNode;
}

/**
 * A card's arrival in a list (the staff app's motion): it fades in while rising 8 dp on a
 * critically damped spring, staggered by its place. Started from its first layout, so no effect
 * runs; the later layouts (its reads arriving and growing it) do not replay it. The rise is
 * computed at render, so a Reduce Motion read that lands mid-way stops the movement at once.
 */
export function Rise({ index, still, children }: RiseProps) {
  const [shown] = useState(() => new Animated.Value(0));
  const started = useRef(false);
  const start = () => {
    if (started.current) return;
    started.current = true;
    const delay = Math.min(Math.max(index, 0), MAX_STAGGER) * STAGGER_MS;
    ARRIVE[still ? 'still' : 'spring'](shown, delay);
  };
  const rise = shown.interpolate({ inputRange: [0, 1], outputRange: [still ? 0 : RISE, 0] });
  return (
    <Animated.View
      testID="rise"
      onLayout={start}
      style={{ opacity: shown, transform: [{ translateY: rise }] }}
    >
      {children}
    </Animated.View>
  );
}
