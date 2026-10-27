import { useEffect, useRef } from 'react';

/** As the bubble's Pressable (delayLongPress={350}): RN's Text has no delayLongPress, its own is 500 ms. */
export const HOLD_MS = 350;

interface HoldPress {
  onPressIn: () => void;
  onPressOut: () => void;
  onPress: () => void;
}

/**
 * A tap or a hold on a span of text: a finger held HOLD_MS runs `onHold` and the release that follows
 * is not a tap; a release or a scroll (press out) before then cancels the hold. Without `onHold` it is
 * a plain tap.
 */
export function useHoldPress(p: { onPress: () => void; onHold: (() => void) | undefined }): HoldPress {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPressIn: () => {
      held.current = false;
      const onHold = p.onHold;
      if (!onHold) return;
      stop();
      timer.current = setTimeout(() => {
        timer.current = null;
        held.current = true;
        onHold();
      }, HOLD_MS);
    },
    onPressOut: stop,
    onPress: () => {
      if (!held.current) p.onPress();
      held.current = false;
    },
  };
}
