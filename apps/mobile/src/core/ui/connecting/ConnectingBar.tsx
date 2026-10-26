import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { connectivity } from '@/core/lib/connectivity/connectivity';
import type { ConnectivityStore } from '@/core/lib/connectivity/connectivity-store';
import { useConnectivity } from '@/core/lib/connectivity/use-connectivity';
import { t } from '@/core/lib/i18n/i18n';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';
import { motion, useTheme } from '@/theme';
import type { BarPhase } from './bar-phase';
import { BarStrip, stripHeight } from './BarStrip';
import { useBarPhase } from './use-bar-phase';

/** iOS has no live regions: say each message once (Android's liveRegion on the strip speaks it). */
function useAnnounce(phase: BarPhase) {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (phase === 'connecting') AccessibilityInfo.announceForAccessibility(t.mobile.connection.connecting);
    if (phase === 'connected') AccessibilityInfo.announceForAccessibility(t.mobile.connection.connected);
  }, [phase]);
}

/**
 * App-wide reconnecting bar (root layout, above the stack). It takes its own height under the status
 * bar and pushes the screen down, never covering it: it starts at the top inset (where the screen's
 * own safe area already was) and grows by the strip, so the screen moves only by the strip. The height
 * is layout, so that one animation runs on the JS driver; the dots run on the native driver.
 */
export function ConnectingBar({ store = connectivity }: { store?: ConnectivityStore }) {
  const phase = useBarPhase(useConnectivity(store));
  const still = useA11yPref('reduceMotion');
  const { top } = useSafeAreaInsets();
  const { color } = useTheme();
  const [height] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState<Exclude<BarPhase, 'hidden'> | null>(null);
  const wasOpen = useRef(false);
  // The strip keeps its last words («تم الاتصال») while it slides away.
  if (phase !== 'hidden' && shown !== phase) setShown(phase);
  useAnnounce(phase);

  useEffect(() => {
    const open = phase !== 'hidden';
    // Opening starts at the top inset, where the screen's own safe area was: only the strip pushes.
    if (open && !wasOpen.current) height.setValue(top);
    wasOpen.current = open;
    const toValue = open ? top + stripHeight(phase) : top;
    const duration = still ? 0 : motion.base;
    const run = Animated.timing(height, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    run.start(({ finished }) => (finished && !open ? setShown(null) : undefined));
    return () => run.stop();
  }, [phase, top, still, height]);

  if (shown === null) return null;
  return (
    <Animated.View style={{ height, paddingTop: top, overflow: 'hidden', backgroundColor: color.margin }}>
      <BarStrip phase={shown} still={still} />
    </Animated.View>
  );
}
