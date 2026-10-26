import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { motion } from '@/theme';
import { hasSavedData, startupMode } from './startup-mode';
import { StartupScreen } from './StartupScreen';

const HAND_OFF_MS = 280;

export interface StartupOverlayProps {
  /** Fonts, language and the session gate are settled: the real screen is mounted underneath. */
  ready: boolean;
  onRetry: () => void;
  fontsLoaded: boolean;
}

/**
 * Lies over the root stack until the app is ready, then fades out over the screen already laid out
 * beneath it (no layout jump: nothing moves, the cover just clears). Inside the query provider: it
 * reads whether the persisted cache brought anything back.
 */
export function StartupOverlay({ ready, onRetry, fontsLoaded }: StartupOverlayProps) {
  const client = useQueryClient();
  const restoring = useIsRestoring();
  const still = useA11yPref('reduceMotion');
  const [opacity] = useState(() => new Animated.Value(1));
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) return undefined;
    const run = Animated.timing(opacity, { toValue: 0, duration: still ? motion.fast : HAND_OFF_MS, useNativeDriver: true });
    run.start(({ finished }) => (finished ? setGone(true) : undefined));
    return () => run.stop();
  }, [ready, still, opacity]);
  if (gone) return null;
  const mode = startupMode({ restoring, hasSaved: !restoring && hasSavedData(client) });
  return (
    <Animated.View pointerEvents={ready ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, { opacity }]}>
      <StartupScreen mode={mode} onRetry={onRetry} fontsLoaded={fontsLoaded} />
    </Animated.View>
  );
}
