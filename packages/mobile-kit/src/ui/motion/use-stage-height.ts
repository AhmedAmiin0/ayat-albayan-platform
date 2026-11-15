import { useState } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import { criticalSpring, STEP_RESPONSE_MS } from './spring';

interface StageHeight {
  /** undefined until the first step is measured: the stage takes its natural height. */
  height: Animated.Value | undefined;
  onLayout: (e: LayoutChangeEvent) => void;
}

const MOVE: Record<'snap' | 'spring', (value: Animated.Value, toValue: number) => void> = {
  snap: (value, toValue) => {
    value.setValue(toValue);
  },
  spring: (value, toValue) => {
    Animated.spring(value, {
      toValue,
      ...criticalSpring(STEP_RESPONSE_MS),
      useNativeDriver: false,
    }).start();
  },
};

/**
 * The staged form's height follows the step on screen: the first measure is taken as is, every
 * later one springs (critically damped; Reduce Motion: set at once). Height cannot run on the
 * native driver, so this value is the JS one, apart from the steps' opacity / slide.
 */
export function useStageHeight(still: boolean): StageHeight {
  const [value] = useState(() => new Animated.Value(0));
  const [known, setKnown] = useState(false);
  const onLayout = (e: LayoutChangeEvent) => {
    const toValue = e.nativeEvent.layout.height;
    setKnown(true);
    value.stopAnimation();
    MOVE[!known || still ? 'snap' : 'spring'](value, toValue);
  };
  return { height: known ? value : undefined, onLayout };
}
