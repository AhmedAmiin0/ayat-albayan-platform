import { useLayoutEffect, useState } from 'react';
import { Animated, I18nManager, PanResponder, type PanResponderInstance } from 'react-native';
import { swipeAnswers, swipeClaims, swipeOffset } from './swipe';

/** The translateX sign of the inline-end (gestures are physical): right in English, left in RTL. */
const end = (): 1 | -1 => (I18nManager.isRTL ? -1 : 1);

type OnReply = (() => void) | undefined;

interface Swipe {
  x: Animated.Value;
  pan: PanResponderInstance;
  /** Hands the responder the latest `onReply` (a refetch never swaps it mid-gesture). */
  update: (onReply: OnReply) => void;
}

const settle = (x: Animated.Value) =>
  Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();

function createSwipe(initial: OnReply): Swipe {
  let onReply = initial;
  const x = new Animated.Value(0);
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => onReply !== undefined && swipeClaims(g, end()),
    onPanResponderMove: (_e, g) => x.setValue(swipeOffset(g.dx, end())),
    onPanResponderRelease: (_e, g) => {
      if (swipeAnswers(g.dx, end())) onReply?.();
      settle(x);
    },
    onPanResponderTerminate: () => settle(x),
    onPanResponderTerminationRequest: () => true,
  });
  return {
    x,
    pan,
    update: (next) => {
      onReply = next;
    },
  };
}

/**
 * SwipeReply's responder, made once: it claims a touch only once it moves sideways, and hands it
 * back whenever the list asks, so a vertical scroll of the inverted list always wins.
 */
export function useSwipeReply(onReply: OnReply): Pick<Swipe, 'x' | 'pan'> {
  const [made] = useState(() => createSwipe(onReply));
  useLayoutEffect(() => made.update(onReply));
  return made;
}
