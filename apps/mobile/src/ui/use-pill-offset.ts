import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// A critically damped spring of ~0.3 s (UIKit's tab selection feel): ω = 2π / response, damping
// ratio 1, so the pill settles without overshoot.
const OMEGA = (2 * Math.PI) / 0.3;
export const PILL_SPRING = { stiffness: OMEGA ** 2, damping: 2 * OMEGA, mass: 1, overshootClamping: true };

export interface PillTarget {
  index: number;
  tabWidth: number;
  rtl: boolean;
}

/** translateX is physical while the pill sits at the logical start: tab n is n widths toward the end. */
export const pillTarget = ({ index, tabWidth, rtl }: PillTarget) => index * tabWidth * (rtl ? -1 : 1);

/**
 * The pill's x offset: springs to the focused tab, or jumps there with «Reduce Motion». No spring
 * on mount. A new target takes over a running spring (from where it is, at zero velocity).
 */
export function usePillOffset({ reduceMotion, ...at }: PillTarget & { reduceMotion: boolean }) {
  const target = pillTarget(at);
  const [x] = useState(() => new Animated.Value(target));
  const shown = useRef(target);
  useEffect(() => {
    if (shown.current === target) return;
    shown.current = target;
    if (reduceMotion) x.setValue(target);
    else Animated.spring(x, { ...PILL_SPRING, toValue: target, useNativeDriver: true }).start();
  }, [x, target, reduceMotion]);
  return x;
}
