import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { criticalSpring, MATERIALIZE_RESPONSE_MS } from '../motion/spring';
import { useA11yPref } from '../primitives/use-a11y-pref';
import { motion } from '../../theme';
import { BrandStartupScreen } from './BrandStartupScreen';
import type { StartupBrand } from './startup-brand';
import { hasSavedData, startupMode } from './startup-mode';
import { StartupScreen } from './StartupScreen';

const HAND_OFF_MS = 280;
/** How much the branded cover grows as it dissolves into the first screen. */
const OPEN_SCALE = 1.08;

type Leave = 'fade' | 'materialize';

/**
 * fade: the cover clears over the screen (the staff app, and Reduce Motion in every app).
 * materialize: an app's own cover (`brand`) grows and clears together on a critically damped
 * spring (docs/50: ~0.35 s response).
 */
type Run = (value: Animated.Value, still: boolean) => Animated.CompositeAnimation;

const LEAVE: Record<Leave, Run> = {
  fade: (value, still) =>
    Animated.timing(value, {
      toValue: 0,
      duration: still ? motion.fast : HAND_OFF_MS,
      useNativeDriver: true,
    }),
  materialize: (value) =>
    Animated.spring(value, {
      toValue: 0,
      ...criticalSpring(MATERIALIZE_RESPONSE_MS),
      useNativeDriver: true,
    }),
};

/** A branded cover materializes unless Reduce Motion is on; the staff cover always fades. */
const leaveOf = (branded: boolean, still: boolean): Leave =>
  branded && !still ? 'materialize' : 'fade';

/** The cover's opacity (the staff cover: that alone); a materializing one also grows. */
interface CoverStyle {
  opacity: Animated.Value;
  transform?: { scale: Animated.AnimatedInterpolation<number> }[];
}

const COVER: Record<Leave, (opacity: Animated.Value) => CoverStyle> = {
  fade: (opacity) => ({ opacity }),
  materialize: (opacity) => {
    const scale = opacity.interpolate({ inputRange: [0, 1], outputRange: [OPEN_SCALE, 1] });
    return { opacity, transform: [{ scale }] };
  },
};

interface StartupOverlayProps {
  /** Fonts, language and the session gate are settled: the real screen is mounted underneath. */
  ready: boolean;
  onRetry: () => void;
  fontsLoaded: boolean;
  /** An app's own startup look (the family app); none: the staff app's emblem screen. */
  brand?: StartupBrand;
}

/**
 * Lies over the root stack until the app is ready, then leaves over the screen already laid out
 * beneath it (no layout jump: nothing under it moves). Inside the query provider: it reads whether
 * the persisted cache brought anything back.
 */
export function StartupOverlay({ ready, onRetry, fontsLoaded, brand }: StartupOverlayProps) {
  const client = useQueryClient();
  const restoring = useIsRestoring();
  const still = useA11yPref('reduceMotion');
  const leave = leaveOf(brand !== undefined, still);
  const [opacity] = useState(() => new Animated.Value(1));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    // Not ready again (an in-session sign-in still waiting on /auth/me): the cover comes back.
    if (!ready) {
      opacity.setValue(1);
      return undefined;
    }
    const run = LEAVE[leave](opacity, still);
    run.start(({ finished }) => (finished ? setGone(true) : undefined));
    return () => run.stop();
  }, [ready, still, opacity, leave]);
  if (gone && ready) return null;
  const mode = startupMode({ restoring, hasSaved: !restoring && hasSavedData(client) });
  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, COVER[leave](opacity)]}
    >
      {brand ? (
        <BrandStartupScreen brand={brand} mode={mode} onRetry={onRetry} fontsLoaded={fontsLoaded} />
      ) : (
        <StartupScreen mode={mode} onRetry={onRetry} fontsLoaded={fontsLoaded} />
      )}
    </Animated.View>
  );
}
