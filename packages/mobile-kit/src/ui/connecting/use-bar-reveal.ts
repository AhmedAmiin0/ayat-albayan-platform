import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const REVEAL_MS = 260;
/** Reduce Motion: no slide, only this opacity fade in and out. */
const STILL_FADE_MS = 150;

interface RevealOptions {
  open: boolean;
  /** The card's measured height (its 12 pt top margin included); 0 until its first layout. */
  content: number;
  still: boolean;
  /** The close has finished: the bar can unmount. Keep it stable (useCallback). */
  onClosed: () => void;
}

interface Run {
  open: boolean;
  content: number;
  still: boolean;
  height: Animated.Value;
  opacity: Animated.Value;
}

/** One open or close: the slide (height on the JS driver, opacity native), or under Reduce Motion the fade. */
function revealRun({ open, content, still, height, opacity }: Run): Animated.CompositeAnimation {
  const toValue = open ? content : 0;
  const fade = (duration: number, easing: (v: number) => number) =>
    Animated.timing(opacity, { toValue: open ? 1 : 0, duration, easing, useNativeDriver: true });
  if (still) {
    if (open) height.setValue(toValue);
    return fade(STILL_FADE_MS, Easing.linear);
  }
  const easing = open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);
  return Animated.parallel([Animated.timing(height, { toValue, duration: REVEAL_MS, easing, useNativeDriver: false }), fade(REVEAL_MS, easing)]);
}

/**
 * Opening: height 0 → content with opacity 0 → 1 over 260 ms ease-out; closing is the reverse. A bar
 * that mounts already open (a screen pushed mid-outage) shows at once, without the slide.
 * Reduce Motion: the height jumps, the opacity fades over 150 ms.
 */
export function useBarReveal({ open, content, still, onClosed }: RevealOptions) {
  const [height] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(0));
  const mountedOpen = useRef(open);
  const revealed = useRef(false);
  useEffect(() => {
    if (!open) mountedOpen.current = false;
    if (!open && !revealed.current) return void onClosed(); // never revealed (not measured yet)
    if (open && content === 0) return undefined; // not measured yet
    revealed.current = true;
    const jump = open && mountedOpen.current;
    mountedOpen.current = false;
    if (jump) {
      height.setValue(content);
      opacity.setValue(1);
      return undefined;
    }
    const run = revealRun({ open, content, still, height, opacity });
    run.start(({ finished }) => {
      if (!finished || open) return;
      revealed.current = false;
      height.setValue(0);
      onClosed();
    });
    return () => run.stop();
  }, [open, content, still, height, opacity, onClosed]);
  return { height, opacity };
}
