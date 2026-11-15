import { useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import { criticalSpring, STEP_RESPONSE_MS } from './spring';

interface StageHeight<K extends string> {
  /** undefined until the first step is measured: the stage takes its natural height. */
  height: Animated.Value | undefined;
  /** onLayout of a step's layer: remembers its height; the step on screen moves the stage. */
  measure: (step: K, onScreen: boolean) => (e: LayoutChangeEvent) => void;
  /** A step comes on screen (useStepMotion.go): spring to its remembered height, if any. */
  show: (step: K) => void;
}

/**
 * The staged form's height follows the step on screen: the first measure is taken as is, every
 * later one springs (critically damped; Reduce Motion: set at once). Each step's height is kept,
 * so a step that comes back (an interrupted move, its view kept) still sizes the stage. A new
 * spring takes over from the running one where it is (nested stages stay smooth). Height cannot
 * run on the native driver, so this is a JS value, like the steps' move it goes with.
 */
export function useStageHeight<K extends string>(still: boolean): StageHeight<K> {
  const [value] = useState(() => new Animated.Value(0));
  const [known, setKnown] = useState(false);
  const sizes = useRef(new Map<K, number>());
  const moveTo = (toValue: number) => {
    const spring = { toValue, ...criticalSpring(STEP_RESPONSE_MS), useNativeDriver: false };
    const snap = !known || still;
    setKnown(true);
    if (snap) value.setValue(toValue);
    else Animated.spring(value, spring).start();
  };
  const measure = (step: K, onScreen: boolean) => (e: LayoutChangeEvent) => {
    const size = e.nativeEvent.layout.height;
    sizes.current.set(step, size);
    if (onScreen) moveTo(size);
  };
  const show = (step: K) => {
    const size = sizes.current.get(step);
    if (size !== undefined) moveTo(size);
  };
  return { height: known ? value : undefined, measure, show };
}
