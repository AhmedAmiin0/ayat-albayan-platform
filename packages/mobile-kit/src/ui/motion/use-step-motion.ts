import { useState } from 'react';
import { Animated } from 'react-native';
import { motion as timing } from '../../theme';
import { criticalSpring, STEP_RESPONSE_MS } from './spring';

export type StepDirection = 'forward' | 'back';

interface StepState<K extends string> {
  current: K;
  /** The step leaving, drawn until the move settles; null at rest. */
  previous: K | null;
  direction: StepDirection;
}

export interface StepMotion<K extends string> extends StepState<K> {
  /** 0 → 1 as `current` comes in and `previous` goes out along the same path. */
  progress: Animated.Value;
  go: (next: K, direction?: StepDirection) => void;
}

/**
 * Reduce Motion: a short cross-fade; else a critically damped spring. On the JS driver, like the
 * stage's height it moves with: an interruption reads the value where it is, at once.
 */
const RUN: Record<'still' | 'spring', (value: Animated.Value) => Animated.CompositeAnimation> = {
  still: (value) =>
    Animated.timing(value, { toValue: 1, duration: timing.base, useNativeDriver: false }),
  spring: (value) =>
    Animated.spring(value, {
      toValue: 1,
      ...criticalSpring(STEP_RESPONSE_MS),
      useNativeDriver: false,
    }),
};

/**
 * Which step a staged form shows, and the move between two (StepStage draws it). Started from the
 * handler that changes the step, so no effect watches it. Interruptible: going back to the step
 * still leaving reverses from where the move is, without a jump.
 */
export function useStepMotion<K extends string>(initial: K, still: boolean): StepMotion<K> {
  const [progress] = useState(() => new Animated.Value(1));
  const [state, setState] = useState<StepState<K>>({
    current: initial,
    previous: null,
    direction: 'forward',
  });
  const settle = () => setState((s) => ({ ...s, previous: null }));
  const go = (next: K, direction: StepDirection = 'forward') => {
    if (next === state.current) return;
    progress.stopAnimation((at) => {
      progress.setValue(next === state.previous ? 1 - at : 0);
      setState({ current: next, previous: state.current, direction });
      RUN[still ? 'still' : 'spring'](progress).start(({ finished }) =>
        finished ? settle() : undefined,
      );
    });
  };
  return { ...state, progress, go };
}
